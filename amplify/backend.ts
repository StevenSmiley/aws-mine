import { defineBackend } from "@aws-amplify/backend";
import * as iam from "aws-cdk-lib/aws-iam";
import { auth } from "./auth/resource";
import { data } from "./data/resource";
import { generateMine } from "./functions/generate-mine/resource";
import { disarmMine } from "./functions/disarm-mine/resource";

const backend = defineBackend({
  auth,
  data,
  generateMine,
  disarmMine,
});

// Disable self sign-up and require users to be added by an admin
const cfnUserPool = backend.auth.resources.cfnResources.cfnUserPool;
cfnUserPool.adminCreateUserConfig = {
  allowAdminCreateUserOnly: true,
};

// Give the generateMine function permission to create IAM users
const createQuarantinedUserStatement = new iam.PolicyStatement({
  sid: "CreateQuarantinedUser",
  effect: iam.Effect.ALLOW,
  actions: ["iam:CreateUser"],
  conditions: {
    ArnEquals: {
      "iam:PermissionsBoundary":
        "arn:aws:iam::aws:policy/AWSCompromisedKeyQuarantineV2",
    },
    StringEquals: { "aws:RequestTag/aws-mine": "quarantined" },
  },
  resources: ["*"],
});
// Give the generateMine function permission to tag IAM users
const tagQuarantinedUserStatement = new iam.PolicyStatement({
  sid: "TagQuarantinedUser",
  effect: iam.Effect.ALLOW,
  actions: ["iam:TagUser"],
  resources: ["*"],
});
// Give the generateMine function permission to create access keys for quarantined users only
const createQuarantinedAccessKeysStatement = new iam.PolicyStatement({
  sid: "CreateQuarantinedAccessKeys",
  effect: iam.Effect.ALLOW,
  actions: ["iam:CreateAccessKey"],
  conditions: {
    StringEquals: { "aws:ResourceTag/aws-mine": "quarantined" },
  },
  resources: ["*"],
});
const generateMineLambda = backend.generateMine.resources.lambda;
generateMineLambda.addToRolePolicy(createQuarantinedUserStatement);
generateMineLambda.addToRolePolicy(tagQuarantinedUserStatement);
generateMineLambda.addToRolePolicy(createQuarantinedAccessKeysStatement);

// Give the disarmMine function permission to delete quarantined users only
const deleteQuarantinedUserStatement = new iam.PolicyStatement({
  sid: "DeleteQuarantinedUser",
  effect: iam.Effect.ALLOW,
  actions: ["iam:DeleteUser"],
  conditions: {
    StringEquals: { "aws:ResourceTag/aws-mine": "quarantined" },
  },
  resources: ["*"],
});
// Give the disarmMine function permission to delete access keys
const deleteAccessKeyStatement = new iam.PolicyStatement({
  sid: "DeleteAccessKey",
  effect: iam.Effect.ALLOW,
  actions: ["iam:DeleteAccessKey"],
  resources: ["*"],
});
const disarmMineLambda = backend.disarmMine.resources.lambda;
disarmMineLambda.addToRolePolicy(deleteQuarantinedUserStatement);
disarmMineLambda.addToRolePolicy(deleteAccessKeyStatement);

export const customResourceStack = backend.createStack(
  "AwsMineCustomResources"
);
