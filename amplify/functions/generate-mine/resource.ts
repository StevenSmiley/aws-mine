import { defineFunction } from "@aws-amplify/backend";
    
export const generateMine = defineFunction({
  name: "generate-mine",
  entry: "./handler.ts"
});