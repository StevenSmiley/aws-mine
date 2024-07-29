import { defineBackend } from "@aws-amplify/backend";
import * as iam from "aws-cdk-lib/aws-iam";
import * as cloudtrail from "aws-cdk-lib/aws-cloudtrail";
import * as logs from "aws-cdk-lib/aws-logs";
import * as destinations from "aws-cdk-lib/aws-logs-destinations";
import * as sns from "aws-cdk-lib/aws-sns";
import { auth } from "./auth/resource";
import { data } from "./data/resource";
import { generateMine } from "./functions/generate-mine/resource";
import { disarmMine } from "./functions/disarm-mine/resource";
import { trippedMine } from "./functions/tripped-mine/resource";
import { CfnFunction } from "aws-cdk-lib/aws-lambda";

const backend = defineBackend({
  auth,
  data,
  generateMine,
  disarmMine,
  trippedMine,
});

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
    destination: new destinations.LambdaDestination(
      backend.trippedMine.resources.lambda
    ),
  }
);

const notificationTopic = new sns.Topic(
  customResourceStack,
  "AwsMineNotificationTopic",
  {
    topicName: "AwsMineNotificationTopic",
  }
);

// Allow trippedMineLambda access to DynamoDB
// const dynamoDBAccessStatement = new iam.PolicyStatement({
//   sid: "DynamoDBAccess",
//   effect: iam.Effect.ALLOW,
//   actions: [
//     "dynamodb:BatchGetItem",
//     "dynamodb:BatchWriteItem",
//     "dynamodb:PutItem",
//     "dynamodb:DeleteItem",
//     "dynamodb:GetItem",
//     "dynamodb:Scan",
//     "dynamodb:Query",
//     "dynamodb:UpdateItem",
//     "dynamodb:ConditionCheckItem",
//     "dynamodb:DescribeTable",
//     "dynamodb:GetRecords",
//     "dynamodb:GetShardIterator",
//   ],
//   resources: ["*"],
// });
const publishToSNSStatement = new iam.PolicyStatement({
  sid: "PublishToSNS",
  effect: iam.Effect.ALLOW,
  actions: ["sns:Publish"],
  resources: [notificationTopic.topicArn],
});
const trippedMineLambda = backend.trippedMine.resources.lambda;
// trippedMineLambda.addToRolePolicy(dynamoDBAccessStatement);
// trippedMineLambda.addToRolePolicy(publishToSNSStatement);
const trippedMineLambdaCfn = trippedMineLambda.node.defaultChild as CfnFunction;
// trippedMineLambdaCfn.addPropertyOverride(
//   "Environment.Variables.NOTIFICATION_TOPIC_ARN",
//   notificationTopic.topicArn
// );
// trippedMineLambdaCfn.addPropertyOverride(
//   "Environment.Variables.APPSYNC_API_ID",
//   backend.data.apiId
// );
// backend.data.addLambdaDataSource(
//   "trippedMineLambdaDataSource",
//   trippedMineLambda
// );
