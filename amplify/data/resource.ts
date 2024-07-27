import { type ClientSchema, a, defineData } from "@aws-amplify/backend";
import { generateMine } from "../functions/generate-mine/resource"

const schema = a.schema({
  Mine: a
    .model({
      accessKeyId: a.string(),
      secretAccessKey: a.string(),
      description: a.string(),
    })
    .authorization((allow) => [
      allow.publicApiKey(),
      allow.authenticated(),
    ]),
  AccessKeys: a.customType({
    accessKeyId: a.string(),
    secretAccessKey: a.string(),
  }),
  GenerateMine: a
    .query()
    .arguments({})
    .returns(a.ref('AccessKeys'))
    .handler(a.handler.function(generateMine))
    .authorization((allow) => [
      allow.publicApiKey(),
      allow.authenticated(),
    ]),
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: "apiKey",
    // API Key is used for a.allow.public() rules
    apiKeyAuthorizationMode: {
      expiresInDays: 30,
    },
  },
});

// Example to fetch records from database
// const { data: mines } = await client.models.Mine.list()
// return <ul>{mines.map(mine => <li key={mine.id}>{mine.content}</li>)}</ul>
