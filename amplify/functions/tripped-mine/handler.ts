import { gunzip } from "zlib";
import { promisify } from "util";

const gunzipAsync = promisify(gunzip);
const AWS_MINE_NOTIFICATION_TOPIC_NAME = "AwsMineNotificationTopic";

export const handler = async (event: any) => {
  try {
    const payload = Buffer.from(event.awslogs.data, "base64");
    const decompressed = await gunzipAsync(payload);
    const result = JSON.parse(decompressed.toString());

    result.logEvents.forEach((logEvent: { message: string }) => {
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
    });
  } catch (error) {
    console.error("Error processing event:", error);
  }
};
