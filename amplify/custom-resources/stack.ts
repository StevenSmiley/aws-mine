import * as cloudtrail from "aws-cdk-lib/aws-cloudtrail";
import * as logs from "aws-cdk-lib/aws-logs";
import * as destinations from "aws-cdk-lib/aws-logs-destinations";
import * as sns from "aws-cdk-lib/aws-sns";
import * as lambda from "aws-cdk-lib/aws-lambda";
import { customResourceStack } from "../backend";

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
      APPSYNC_API_ID: "placeholder",
      NOTIFICATION_TOPIC_ARN: notificationTopic.topicArn,
    },
  }
);

notificationTopic.grantPublish(trippedMineFunction);
// TODO: Give the tripped mine function permission to call the GraphQL API

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
