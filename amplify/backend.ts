import { defineBackend } from '@aws-amplify/backend';
import { auth } from './auth/resource';
import { data } from './data/resource';
import { createMine } from './functions/create-mine/resource';

defineBackend({
  auth,
  data,
  createMine,
});
