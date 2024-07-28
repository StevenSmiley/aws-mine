import { defineBackend } from '@aws-amplify/backend';
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

