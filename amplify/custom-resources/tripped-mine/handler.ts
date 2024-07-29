import { gunzip } from "zlib";
import { promisify } from "util";

const gunzipAsync = promisify(gunzip);
const NOTIFICATION_TOPIC_ARN = process.env.NOTIFICATION_TOPIC_ARN;
const APPSYNC_API_ID = process.env.APPSYNC_API_ID;

import type {
  CloudWatchLogsEvent,
  CloudWatchLogsDecodedData,
  CloudWatchLogsLogEvent,
} from "aws-lambda";

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
      // TODO: Update the Mine table to set tripped=true and trippedAt=eventTime for the accessKeyId

      // TODO: If that mine wasn't already tripped, publish to the SNS topic
    });
  } catch (error) {
    console.error("Error processing event:", error);
  }
};
