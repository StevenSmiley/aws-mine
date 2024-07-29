import { gunzip } from "zlib";
import { promisify } from "util";
import type {
  CloudWatchLogsEvent,
  CloudWatchLogsDecodedData,
  CloudWatchLogsLogEvent,
} from "aws-lambda";
import * as ddb from "@aws-sdk/client-dynamodb";
import * as sns from "@aws-sdk/client-sns";

const gunzipAsync = promisify(gunzip);
const NOTIFICATION_TOPIC_ARN = process.env.NOTIFICATION_TOPIC_ARN;
const MINE_TABLE_ARN = process.env.MINE_TABLE_ARN!;
const snsClient = new sns.SNSClient();
const ddbClient = new ddb.DynamoDBClient();

async function handleTrippedMine(accessKeyId: string, eventTime: string) {
  console.log(`Handling tripped mine for accessKeyId: ${accessKeyId}`);

  try {
    const getItemResponse = await ddbClient.send(
      new ddb.GetItemCommand({
        TableName: MINE_TABLE_ARN,
        Key: {
          accessKeyId: { S: accessKeyId },
        },
      })
    );
    console.log("GetItem response:", JSON.stringify(getItemResponse, null, 2));
    if (getItemResponse.Item?.tripped?.BOOL) {
      console.log("Mine has already been tripped");
      return;
    }

    console.log("Publishing to SNS topic");
    await snsClient.send(
      new sns.PublishCommand({
        TopicArn: NOTIFICATION_TOPIC_ARN,
        Message: `Mine with access key ID ${accessKeyId} and description ${getItemResponse.Item?.description?.S} has been tripped at ${eventTime}.`,
      })
    );

    console.log("Updating DynamoDB table");
    const updateResponse = await ddbClient.send(
      new ddb.UpdateItemCommand({
        TableName: MINE_TABLE_ARN,
        Key: {
          accessKeyId: { S: accessKeyId },
        },
        UpdateExpression: "SET tripped = :tripped, trippedAt = :trippedAt",
        ExpressionAttributeValues: {
          ":tripped": { BOOL: true },
          ":trippedAt": { S: eventTime },
        },
      })
    );
    console.log("Update response:", JSON.stringify(updateResponse, null, 2));
  } catch (error) {
    console.error("Error in handleTrippedMine:", error);
  }
}

export const handler = async (event: CloudWatchLogsEvent) => {
  try {
    const payload = Buffer.from(event.awslogs.data, "base64");
    const decompressed = await gunzipAsync(payload);
    const result: CloudWatchLogsDecodedData = JSON.parse(
      decompressed.toString()
    );

    result.logEvents.forEach((logEvent: CloudWatchLogsLogEvent) => {
      const message = JSON.parse(logEvent.message);
      const interestingFields = {
        accessKeyId: message.userIdentity.accessKeyId,
        eventTime: message.eventTime,
        eventName: message.eventName,
        eventSource: message.eventSource,
        awsRegion: message.awsRegion,
        userAgent: message.userAgent,
        sourceIPAddress: message.sourceIPAddress,
      };
      console.log("Tripped mine, interesting fields:", interestingFields);
      handleTrippedMine(
        interestingFields.accessKeyId,
        interestingFields.eventTime
      );
    });
  } catch (error) {
    console.error("Error processing event:", error);
  }
};
