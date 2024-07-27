import { type ClientSchema, a, defineData } from "@aws-amplify/backend";
import { generateMine } from "../functions/generate-mine/resource"

const schema = a.schema({
  Mine: a
    .model({
      description: a.string(),
    })
    .authorization((allow) => [allow.publicApiKey()]),
  AccessKeys: a.customType({
    accessKeyId: a.string(),
    secretAccessKey: a.string(),
  }),
  GenerateMine: a
    .query()
    .arguments({})
    .returns(a.ref('AccessKeys'))
    .handler(a.handler.function(generateMine))
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

/*== STEP 2 ===============================================================
Go to your frontend source code. From your client-side code, generate a
Data client to make CRUDL requests to your table. (THIS SNIPPET WILL ONLY
WORK IN THE FRONTEND CODE FILE.)

Using JavaScript or Next.js React Server Components, Middleware, Server 
Actions or Pages Router? Review how to generate Data clients for those use
cases: https://docs.amplify.aws/gen2/build-a-backend/data/connect-to-API/
=========================================================================*/

/*
"use client"
import { generateClient } from "aws-amplify/data";
import type { Schema } from "@/amplify/data/resource";

const client = generateClient<Schema>() // use this Data client for CRUDL requests
*/

/*== STEP 3 ===============================================================
Fetch records from the database and use them in your frontend component.
(THIS SNIPPET WILL ONLY WORK IN THE FRONTEND CODE FILE.)
=========================================================================*/

/* For example, in a React component, you can use this snippet in your
  function's RETURN statement */
// const { data: mines } = await client.models.Mine.list()

// return <ul>{mines.map(mine => <li key={mine.id}>{mine.content}</li>)}</ul>
