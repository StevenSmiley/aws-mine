import type { Schema } from "../../data/resource"
import { IAMClient, DeleteUserCommand, DeleteAccessKeyCommand } from "@aws-sdk/client-iam";

const iamClient = new IAMClient({});

export const handler: Schema["DisarmMine"]["functionHandler"] = async (event) => {
  if (!event.arguments.username) {
    return {
      statusCode: 400,
      body: "Missing username"
    }
  }
  if (!event.arguments.accessKeyId) {
    return {
      statusCode: 400,
      body: "Missing accessKeyId"
    }
  }
  try {
    await iamClient.send(new DeleteAccessKeyCommand({
      AccessKeyId: event.arguments.accessKeyId,
      UserName: event.arguments.username,
    }));
    await iamClient.send(new DeleteUserCommand({
      UserName: event.arguments.username,
    }));
    return {
      statusCode: 200,
      body: "IAM user and access key deleted successfully"
    }
  } catch (error) {
    console.error("Could not delete IAM user:", error);
    return {
      statusCode: 500,
      body: "Failed to delete IAM user and access key"
    }
  }
};
