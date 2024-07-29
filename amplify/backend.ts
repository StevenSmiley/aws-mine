import * as url from "node:url";
import { defineBackend } from "@aws-amplify/backend";
import * as iam from "aws-cdk-lib/aws-iam";
import { auth } from "./auth/resource";
import { data } from "./data/resource";
import { generateMine } from "./functions/generate-mine/resource";
import { disarmMine } from "./functions/disarm-mine/resource";
import * as cloudtrail from "aws-cdk-lib/aws-cloudtrail";
import * as logs from "aws-cdk-lib/aws-logs";
import * as destinations from "aws-cdk-lib/aws-logs-destinations";
import * as sns from "aws-cdk-lib/aws-sns";
import * as lambda from "aws-cdk-lib/aws-lambda";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";

const backend = defineBackend({
  auth,
  data,
  generateMine,
  disarmMine,
});

const mineTableName = backend.data.resources.tables["Mine"].tableName;
const mineTableArn = backend.data.resources.tables["Mine"].tableArn;

// Disable self sign-up and require users to be added by an admin
const cfnUserPool = backend.auth.resources.cfnResources.cfnUserPool;
cfnUserPool.adminCreateUserConfig = {
  allowAdminCreateUserOnly: true,
};

// Give the generateMine function permission to create IAM users
const createQuarantinedUserStatement = new iam.PolicyStatement({
  sid: "CreateQuarantinedUser",
  effect: iam.Effect.ALLOW,
  actions: ["iam:CreateUser"],
  conditions: {
    ArnEquals: {
      "iam:PermissionsBoundary":
        "arn:aws:iam::aws:policy/AWSCompromisedKeyQuarantineV2",
    },
    StringEquals: { "aws:RequestTag/aws-mine": "quarantined" },
  },
  resources: ["*"],
});
// Give the generateMine function permission to tag IAM users
const tagQuarantinedUserStatement = new iam.PolicyStatement({
  sid: "TagQuarantinedUser",
  effect: iam.Effect.ALLOW,
  actions: ["iam:TagUser"],
  resources: ["*"],
});
// Give the generateMine function permission to create access keys for quarantined users only
const createQuarantinedAccessKeysStatement = new iam.PolicyStatement({
  sid: "CreateQuarantinedAccessKeys",
  effect: iam.Effect.ALLOW,
  actions: ["iam:CreateAccessKey"],
  conditions: {
    StringEquals: { "aws:ResourceTag/aws-mine": "quarantined" },
  },
  resources: ["*"],
});
const generateMineLambda = backend.generateMine.resources.lambda;
generateMineLambda.addToRolePolicy(createQuarantinedUserStatement);
generateMineLambda.addToRolePolicy(tagQuarantinedUserStatement);
generateMineLambda.addToRolePolicy(createQuarantinedAccessKeysStatement);

// Give the disarmMine function permission to delete quarantined users only
const deleteQuarantinedUserStatement = new iam.PolicyStatement({
  sid: "DeleteQuarantinedUser",
  effect: iam.Effect.ALLOW,
  actions: ["iam:DeleteUser"],
  conditions: {
    StringEquals: { "aws:ResourceTag/aws-mine": "quarantined" },
  },
  resources: ["*"],
});
// Give the disarmMine function permission to delete access keys
const deleteAccessKeyStatement = new iam.PolicyStatement({
  sid: "DeleteAccessKey",
  effect: iam.Effect.ALLOW,
  actions: ["iam:DeleteAccessKey"],
  resources: ["*"],
});
const disarmMineLambda = backend.disarmMine.resources.lambda;
disarmMineLambda.addToRolePolicy(deleteQuarantinedUserStatement);
disarmMineLambda.addToRolePolicy(deleteAccessKeyStatement);

const customResourceStack = backend.createStack("AwsMineCustomResources");

const logGroup = new logs.LogGroup(
  customResourceStack,
  "AwsMineTrailLogGroup",
  {
    retention: logs.RetentionDays.ONE_WEEK,
  }
);

const trail = new cloudtrail.Trail(customResourceStack, "AwsMineTrail", {
  isMultiRegionTrail: true,
  includeGlobalServiceEvents: true,
  managementEvents: cloudtrail.ReadWriteType.ALL,
  sendToCloudWatchLogs: true,
  cloudWatchLogGroup: logGroup,
});

const notificationTopic = new sns.Topic(
  customResourceStack,
  "AwsMineNotificationTopic"
);

const trippedMineFunction = new NodejsFunction(
  customResourceStack,
  "AwsMineTrippedFunction",
  {
    runtime: lambda.Runtime.NODEJS_18_X,
    entry: url.fileURLToPath(
      new URL("./functions/tripped-mine/handler.ts", import.meta.url)
    ),
    environment: {
      MINE_TABLE_NAME: mineTableName,
      NOTIFICATION_TOPIC_ARN: notificationTopic.topicArn,
    },
  }
);

notificationTopic.grantPublish(trippedMineFunction);

// Allow trippedMineFunction access to the DynamoDB table
const readWriteToMineTableStatement = new iam.PolicyStatement({
  sid: "DynamoDBAccess",
  effect: iam.Effect.ALLOW,
  actions: [
    "dynamodb:BatchGetItem",
    "dynamodb:BatchWriteItem",
    "dynamodb:PutItem",
    "dynamodb:DeleteItem",
    "dynamodb:GetItem",
    "dynamodb:Scan",
    "dynamodb:Query",
    "dynamodb:UpdateItem",
    "dynamodb:ConditionCheckItem",
    "dynamodb:DescribeTable",
    "dynamodb:GetRecords",
    "dynamodb:GetShardIterator",
  ],
  resources: [mineTableArn, mineTableArn + "/*"],
});
trippedMineFunction.addToRolePolicy(readWriteToMineTableStatement);

new logs.SubscriptionFilter(
  customResourceStack,
  "AwsMineTrailSubscriptionFilter",
  {
    logGroup: logGroup,
    filterPattern: logs.FilterPattern.stringValue(
      "$.userIdentity.userName",
      "=",
      "devops-admin-*"
    ),
    destination: new destinations.LambdaDestination(trippedMineFunction),
  }
);
