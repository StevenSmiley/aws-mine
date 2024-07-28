import { defineBackend } from '@aws-amplify/backend';
import * as iam from "aws-cdk-lib/aws-iam"
import { auth } from './auth/resource';
import { data } from './data/resource';
import { generateMine } from './functions/generate-mine/resource';

const backend = defineBackend({
  auth,
  data,
  generateMine,
});

// Disable self sign-up and require users to be added by an admin
const cfnUserPool = backend.auth.resources.cfnResources.cfnUserPool;
cfnUserPool.adminCreateUserConfig = {
  allowAdminCreateUserOnly: true,
};

const customResourceStack = backend.createStack('AwsMineCustomResources');

// Give the generateMine function permission to create IAM users
const createQuarantinedUserStatement = new iam.PolicyStatement({
  sid: "CreateUser",
  actions: ["iam:CreateUser"],
  conditions: [{
      "StringLike": {
        "iam:PermissionsBoundary": "arn:aws:iam::aws:policy/AWSCompromisedKeyQuarantineV2"
      }
    },
    {
      "StringEquals": {
        "aws:RequestTag/aws-mine": "quarantined"
      },
    }],
})
// Give the generateMine function permission to create access keys for quarantied users only
const createQuarantinedAccessKeysStatement = new iam.PolicyStatement({
  sid: "CreateUser",
  actions: ["iam:CreateAccessKeys"],
  conditions: [{
    "StringEquals": {
      "aws:ResourceTag/aws-mine": "quarantined"
    }
  }],
})

const generateMineLambda = backend.generateMine.resources.lambda
generateMineLambda.addToRolePolicy(createQuarantinedUserStatement)
generateMineLambda.addToRolePolicy(createQuarantinedAccessKeysStatement)