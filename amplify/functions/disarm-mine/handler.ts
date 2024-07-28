import type { Schema } from "../../data/resource"
import { IAMClient, DeleteUserCommand } from "@aws-sdk/client-iam";

const iamClient = new IAMClient({});

export const handler: Schema["DisarmMine"]["functionHandler"] = async (event) => {
  if (!event.arguments.username) {
    return {
      statusCode: 400,
      body: "Missing username"
    }
  }
  try {
    await iamClient.send(new DeleteUserCommand({
      UserName: event.arguments.username,
    }));
    return {
      statusCode: 200,
      body: "IAM user deleted successfully"
    }
  } catch (error) {
    console.error("Could not delete IAM user:", error);
    return {
      statusCode: 500,
      body: "Failed to delete IAM user"
    }
  }
};
