var zlib = require('zlib');

export const handler = async (event: any, context: any) => {
  console.log("Event: ", event);
  var payload = Buffer.from(event.awslogs.data, 'base64');
  zlib.gunzip(payload, function(e: any, result: any) {
      if (e) { 
          context.fail(e);
      } else {
          result = JSON.parse(result.toString());
          console.log("Event Data:", JSON.stringify(result, null, 2));
      }
      result.logEvents.forEach((logEvent: { message: string; }) => {
        const message=JSON.parse(logEvent.message);
        console.log("Parsed message:", message);
        const interestingFields = {
            accessKeyId: message.userIdentity.accessKeyId,
            eventName: message.eventName,
            eventSource: message.eventSource,
            awsRegion: message.awsRegion,
            userAgent: message.userAgent,
            sourceIPAddress: message.sourceIPAddress,
          }
          console.log("Interesting fields:", interestingFields)
      });
  });
  return;
};