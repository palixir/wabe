# Concepts

Wabe has several concepts unique to it. We will define and explain them here, as you may encounter them in various parts of the documentation.

## WabeTypes

`Wabe` includes a configuration option that generates two codegen files (this option can be disabled). If enabled, you will get a `schema.graphql` file as well as a `wabe.ts` file in the directory you specified. The wabe.ts file contains your entire schema in the form of TypeScript types, including the types of your various classes, enums you've defined, and scalars.

When declaring multiple types (like the Wabe class, the WabeContext, etc.), you can define a generic type to propagate your codegen-generated types (see example below).

```ts
import type { WabeSchemaEnums, WabeSchemaTypes } from "../generated/wabe";

export type YourTypes = {
  enums: WabeSchemaEnums;
  types: WabeSchemaTypes;
  scalars: WabeSchemaScalars;
};

// Now you can add this types in the declaration of others class/types to propagate the types

const wabe = new Wabe<YourTypes>(...)

// or 

const anyFunction = (context: WabeContext<YourTypes>) => {}
```

## WabeContext

The Wabe context is an object used in multiple places within Wabe, such as in GraphQL resolvers or in every call to the `DatabaseController`. It contains information about the request (including the person who initiated it). It also includes the Wabe configuration, allowing access to information like schemas or authentication elements within resolvers and during processing. Here is the `WabeContext` type :

```ts
export interface WabeContext<T extends WabeTypes> {
  response?: WobeResponse;
  user?: User | null;
  sessionId?: string;
  isRoot: boolean;
  wabe: Wabe<T>;
}
```

## Wabe root key

The root key is a critical element of a Wabe application. It allows you to execute a request (via the GraphQL API or the DatabaseController) by bypassing all security checks. It should be used ONLY by the backend for root operations, such as in recurring application cron jobs or within a resolver. It should never be passed to the frontend and must be stored as a secret in the hosting infrastructure. It can also be used in the GraphQL playground to test queries without passing a user ID in the request header. To function, the root key must be included in the request header as Wabe-Root-Key. In the backend, the isRoot field of the WabeContext can also be set to true.

Example of GraphQLClient creates with root key :

```ts
const client = new GraphQLClient(`http://127.0.0.1:3000/graphql`, {
  headers: {
    "Wabe-Root-Key": "YourRootKeyAsLongAsPossible",
  },
});
```

**Recommendations:**
The **rootKey** should be as long as possible (at least 64 characters) and include letters, special characters, and numbers.
