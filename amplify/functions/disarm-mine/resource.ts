import { defineFunction } from "@aws-amplify/backend";
    
export const disarmMine = defineFunction({
  name: "disarm-mine",
  entry: "./handler.ts"
});