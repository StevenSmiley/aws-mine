import { defineFunction } from "@aws-amplify/backend";
    
export const createMine = defineFunction({
  name: "create-mine",
  entry: "./handler.ts"
});