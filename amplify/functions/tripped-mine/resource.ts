import { defineFunction } from "@aws-amplify/backend";

export const trippedMine = defineFunction({
  name: "tripped-mine",
  entry: "./handler.ts",
});
