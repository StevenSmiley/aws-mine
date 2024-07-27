import type { Schema } from "../../data/resource"

export const handler: Schema["GenerateMine"]["functionHandler"] = async (event) => {
  return {
    "accessKeyId": "akia1234",
    "secretAccessKey": "secret1234",
  };
};