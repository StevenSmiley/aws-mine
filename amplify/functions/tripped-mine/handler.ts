import { gunzip } from 'zlib';
import { promisify } from 'util';

const gunzipAsync = promisify(gunzip);

export const handler = async (event: any) => {
  console.log("Event: ", event);
  
  try {
    const payload = Buffer.from(event.awslogs.data, 'base64');
    const decompressed = await gunzipAsync(payload);
    const result = JSON.parse(decompressed.toString());
    
    console.log("Event Data:", JSON.stringify(result, null, 2));

    result.logEvents.forEach((logEvent: { message: string }) => {
      const message = JSON.parse(logEvent.message);
      console.log("Parsed message:", message);
      
      const interestingFields = {
        accessKeyId: message.userIdentity.accessKeyId,
        eventName: message.eventName,
        eventSource: message.eventSource,
        awsRegion: message.awsRegion,
        userAgent: message.userAgent,
        sourceIPAddress: message.sourceIPAddress,
      };
      
      console.log("Interesting fields:", interestingFields);
    });
  } catch (error) {
    console.error("Error processing event:", error);
  }
};