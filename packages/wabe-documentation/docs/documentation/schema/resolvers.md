# Resolvers

In the `schema` object of the `Wabe` configuration, you can also define resolvers. These resolvers correspond to GraphQL resolvers (when we integrate automatic REST API generation, they will correspond to REST endpoints). They are divided into two categories: on one side, queries, which allow you to request data or return a result without performing any mutations on the data in the database; and on the other side, mutations, which, as their name suggests, allow you to modify the data in the database.

## Queries

For each `query` you choose to create, you can give it a name (in the example below, "helloWorld"). You can also specify a return type (supported types in Wabe include String, Int, Float, Boolean, File, etc.). Additionally, you can provide arguments if needed. Finally, you must assign it a resolver function that contains the code to execute when your query is called.

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

Just like with queries, you can create `mutations` (such as "sumAndUpdateResult" in the example below) with a return type, arguments (within the input object), and a resolver function.

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
