import { gunzip } from "zlib";
import { promisify } from "util";
import type {
  CloudWatchLogsEvent,
  CloudWatchLogsDecodedData,
  CloudWatchLogsLogEvent,
} from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocument } from "@aws-sdk/lib-dynamodb";
import * as sns from "@aws-sdk/client-sns";

const gunzipAsync = promisify(gunzip);
const NOTIFICATION_TOPIC_ARN = process.env.NOTIFICATION_TOPIC_ARN;
const MINE_TABLE_NAME = process.env.MINE_TABLE_NAME!;
const snsClient = new sns.SNSClient();
const docClient = DynamoDBDocument.from(new DynamoDBClient({}));

async function handleTrippedMine(accessKeyId: string, eventTime: string) {
  const getItemResponse = await docClient.get({
    TableName: MINE_TABLE_NAME,
    Key: {
      accessKeyId: accessKeyId,
    },
    ConsistentRead: true,
  });

  if (getItemResponse.Item?.tripped?.BOOL) {
    console.log("Mine has already been tripped");
    return;
  }

  await snsClient.send(
    new sns.PublishCommand({
      TopicArn: NOTIFICATION_TOPIC_ARN,
      MessageGroupId: "aws-mine",
      Subject: "aws-mine: Mine tripped",
      Message: `Mine with access key ID ${accessKeyId} and description "${getItemResponse
        .Item?.description!}" has been tripped.`,
    })
  );

  const updateResponse = await docClient.update({
    TableName: MINE_TABLE_NAME,
    Key: {
      accessKeyId: accessKeyId,
    },
    UpdateExpression: "SET tripped = :tripped, trippedAt = :trippedAt",
    ExpressionAttributeValues: {
      ":tripped": true,
      ":trippedAt": eventTime,
    },
  });
}

export const handler = async (event: CloudWatchLogsEvent) => {
  try {
    const payload = Buffer.from(event.awslogs.data, "base64");
    const decompressed = await gunzipAsync(payload);
    const result: CloudWatchLogsDecodedData = JSON.parse(
      decompressed.toString()
    );

    for (const logEvent of result.logEvents) {
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
      await handleTrippedMine(
        interestingFields.accessKeyId,
        interestingFields.eventTime
      );
    }
  } catch (error) {
    console.error("Error processing event:", error);
  }
};
