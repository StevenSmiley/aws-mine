import type { Schema } from "../../data/resource"

export const handler: Schema["GenerateMine"]["functionHandler"] = async (event) => {
  const response = {
    "accessKeyId": "akia1234",
    "secretAccessKey": "secret1234",
  }
  console.log(response)
  return response;
};