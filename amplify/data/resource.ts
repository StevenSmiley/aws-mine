import { type ClientSchema, a, defineData } from "@aws-amplify/backend";
import { generateMine } from "../functions/generate-mine/resource";
import { disarmMine } from "../functions/disarm-mine/resource";

const schema = a.schema({
  Mine: a
    .model({
      username: a.string(),
      accessKeyId: a.string(),
      secretAccessKey: a.string(),
      description: a.string(),
    })
    .authorization((allow) => [allow.publicApiKey(), allow.authenticated()]),
  TrippedMineEvent: a
    .model({
      accessKeyId: a.string(),
      notified: a.boolean(),
      eventName: a.string(),
      eventSource: a.string(),
      awsRegion: a.string(),
      userAgent: a.string(),
      sourceIPAddress: a.string(),
    })
    .authorization((allow) => [
      allow.publicApiKey().to(["read"]),
      allow.authenticated().to(["read"]),
    ]),
  AccessKeys: a.customType({
    username: a.string(),
    accessKeyId: a.string(),
    secretAccessKey: a.string(),
  }),
  HttpResponse: a.customType({
    statusCode: a.integer(),
    body: a.string(),
  }),
  GenerateMine: a
    .query()
    .arguments({})
    .returns(a.ref("AccessKeys"))
    .handler(a.handler.function(generateMine))
    .authorization((allow) => [allow.publicApiKey(), allow.authenticated()]),
  DisarmMine: a
    .query()
    .arguments({
      username: a.string(),
      accessKeyId: a.string(),
    })
    .returns(a.ref("HttpResponse"))
    .handler(a.handler.function(disarmMine))
    .authorization((allow) => [allow.publicApiKey(), allow.authenticated()]),
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
