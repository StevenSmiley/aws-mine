import * as cloudtrail from "aws-cdk-lib/aws-cloudtrail";
import * as logs from "aws-cdk-lib/aws-logs";
import * as destinations from "aws-cdk-lib/aws-logs-destinations";
import * as sns from "aws-cdk-lib/aws-sns";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as iam from "aws-cdk-lib/aws-iam";
import { customResourceStack, mineTableArn } from "../backend";

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

const trippedMineFunction = new lambda.Function(
  customResourceStack,
  "AwsMineTrippedFunction",
  {
    runtime: lambda.Runtime.NODEJS_18_X,
    handler: "index.handler",
    code: lambda.Code.fromAsset("./tripped-mine"),
    environment: {
      MINE_TABLE_ARN: mineTableArn,
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
