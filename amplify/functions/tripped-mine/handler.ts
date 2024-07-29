export const handler = async (event: any) => {
  console.log("Event: ", event);
  event.logEvents.forEach((logEvent: { message: string; }) => {
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
  return;
};