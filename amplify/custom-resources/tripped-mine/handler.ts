import { gunzip } from "zlib";
import { promisify } from "util";
import type {
  CloudWatchLogsEvent,
  CloudWatchLogsDecodedData,
  CloudWatchLogsLogEvent,
} from "aws-lambda";
import crypto from "@aws-crypto/sha256-js";
import { defaultProvider } from "@aws-sdk/credential-provider-node";
import { SignatureV4 } from "@aws-sdk/signature-v4";
import { HttpRequest } from "@aws-sdk/protocol-http";
import { default as fetch, Request } from "node-fetch";
import * as sns from "@aws-sdk/client-sns";

const gunzipAsync = promisify(gunzip);
const NOTIFICATION_TOPIC_ARN = process.env.NOTIFICATION_TOPIC_ARN;
const snsClient = new sns.SNSClient();
const GRAPHQL_URL = process.env.GRAPHQL_URL!;
// const APPSYNC_API_KEY = process.env.APPSYNC_API_KEY;
const AWS_REGION = process.env.AWS_REGION!;

const endpoint = new URL(GRAPHQL_URL);
const { Sha256 } = crypto;
const signer = new SignatureV4({
  credentials: defaultProvider(),
  region: AWS_REGION,
  service: "appsync",
  sha256: Sha256,
});

async function signAndFetchGraphQL(
  query: string,
  variables?: any
): Promise<any> {
  const requestToBeSigned = new HttpRequest({
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      host: endpoint.host,
    },
    hostname: endpoint.host,
    body: JSON.stringify({ query, variables }),
    path: endpoint.pathname,
  });

  const signed = await signer.sign(requestToBeSigned);
  const request = new Request(GRAPHQL_URL, signed);
  const response = await fetch(request);
  return response.json();
}
async function handleTrippedMine(accessKeyId: string, eventTime: string) {
  // Check if mine has already been tripped by querying the graphQL endpoint
  const getMine = /* GraphQL */ `
    query GetMine {
      getMine(accessKeyId: ${accessKeyId}) {
        description
        tripped
        trippedAt
        createdAt
      }
    }
  `;
  const body: any = await signAndFetchGraphQL(getMine);
  console.log("GraphQL response:", body);
  // If that mine wasn't already tripped, publish to the SNS topic
  if (!body.data.getMine.tripped) {
    // Publish to SNS topic
    snsClient.send(
      new sns.PublishCommand({
        TopicArn: NOTIFICATION_TOPIC_ARN,
        Message: `Mine with access key ID ${accessKeyId} and description ${body.data.getMine.description} has been tripped at ${eventTime}.`,
      })
    );
  }

  // Update the Mine table to set tripped=true and trippedAt=eventTime for the accessKeyId
  const updateMine = /* GraphQL */ `
    mutation UpdateMine {
      updateMine(accessKeyId: ${accessKeyId}) {
        tripped
        trippedAt
      }
    }
  `;
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
