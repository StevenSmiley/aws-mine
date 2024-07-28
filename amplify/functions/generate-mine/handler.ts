import type { Schema } from "../../data/resource"
import { IAMClient, CreateUserCommand, CreateAccessKeyCommand } from "@aws-sdk/client-iam";
import { randomUUID } from 'crypto';

const iamClient = new IAMClient({});

async function createIAMUserAndAccessKeys(username: string) {
  try {
    // Create IAM user
    await iamClient.send(new CreateUserCommand({
      UserName: username,
      PermissionsBoundary: 'arn:aws:iam::aws:policy/AWSCompromisedKeyQuarantineV2',
      Tags: [{ Key: 'aws-mine', Value: 'quarantined' }]
    }
    ));

    // Create access keys for the user
    const createAccessKeyParams = { UserName: username };
    const accessKeyData = await iamClient.send(new CreateAccessKeyCommand(createAccessKeyParams));

    return {
      username: username,
      accessKeyId: accessKeyData.AccessKey?.AccessKeyId,
      secretAccessKey: accessKeyData.AccessKey?.SecretAccessKey,
    };
  } catch (error) {
    console.error("Error creating IAM user and access keys:", error);
    throw error;
  }
}

export const handler: Schema["GenerateMine"]["functionHandler"] = async (event) => {
  try {
    const username = `devops-admin-${randomUUID()}`;
    const response = await createIAMUserAndAccessKeys(username);
    console.log(response);
    return response;
  } catch (error) {
    console.error("Error in handler:", error);
    throw error;
  }
};
