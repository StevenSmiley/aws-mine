import { defineBackend } from '@aws-amplify/backend';
import { auth } from './auth/resource';
import { data } from './data/resource';
import { generateMine } from './functions/generate-mine/resource';

defineBackend({
  auth,
  data,
  generateMine,
});
