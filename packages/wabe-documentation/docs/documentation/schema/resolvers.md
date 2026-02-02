# Resolvers

Resolvers extend Wabe's functionality by allowing you to define custom GraphQL queries and mutations. They complement the automatically generated CRUD operations with your own business logic.

## Resolver Types

Wabe supports two types of resolvers:

- **Queries**: Read-only operations that retrieve data or perform calculations without modifying the database
- **Mutations**: Operations that modify data in the database or perform side effects

Both types follow the same structure but serve different purposes in your GraphQL API.

## Queries

Query resolvers allow you to define custom read operations. Each query requires:

- **name**: Unique identifier for the query
- **type**: Return type (can be any Wabe-supported type including custom scalars and enums)
- **description**: Optional description (appears in GraphQL documentation)
- **args**: Input arguments with their types and requirements
- **resolve**: Function that executes when the query is called

The resolver function receives standard GraphQL resolver parameters: `root`, `args`, and `context`.

```ts
import { Wabe } from "wabe";

const run = async () => {
  const wabe = new Wabe({
    // ... others configs fields
    schema: {
      resolvers: {
        queries: {
          helloWorld: {
            // Output type
            type: "String",
            // Description of the query
            description: "Hello world description",
            // Arguments of the query
            args: {
              name: {
                type: "String",
                required: true,
              },
            },
            // The resolver to call when we call the query
            // Context argument contains the Wabe context (you can see more information about it in the Context sections in Wabe notions)
            resolve: (root, args, context) => "Hello World",
          },
        },
      },
    },
  });

  await wabe.start();
};

await run();
```

## Mutations

Mutation resolvers follow the same structure as queries but are designed for operations that modify data or perform side effects. They typically:

- Accept input arguments (usually grouped in an `input` object)
- Perform database operations or other side effects
- Return the result of the operation

Mutations use the same resolver function signature as queries.

```ts
import { Wabe } from "wabe";

const run = async () => {
  const wabe = new Wabe({
    // ... others configs fields
    schema: {
      resolvers: {
        sumAndUpdateResult: {
          type: "Int",
          args: {
            input: {
              a: {
                type: "Int",
              },
              b: {
                type: "Int",
              },
            },
          },
          resolve: (root, args) => {
            const sum = args.input.a + args.input.b;

            // ... suppose we update sum in database

            return sum;
          },
        },
      },
    },
  });

  await wabe.start();
};

await run();
```
