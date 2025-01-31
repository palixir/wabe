# Wabe root key

The root key is a critical element of a Wabe application. It allows you to execute a request (via the GraphQL API or the DatabaseController) by bypassing all security checks. It should be used ONLY by the backend for root operations, such as in recurring application cron jobs or within a resolver. It should never be passed to the frontend and must be stored as a secret in the hosting infrastructure. It can also be used in the GraphQL playground to test queries without passing a user ID in the request header. To function, the root key must be included in the request header as Wabe-Root-Key. In the backend, the isRoot field of the WabeContext can also be set to true.

```ts
import { Wabe } from "wabe";

const run = async () => {
  const wabe = new Wabe({
    // ... others config fields
    rootKey:
      "0uwFvUxM$ceFuF1aEtTtZMa7DUN2NZudqgY5ve5W*QCyb58cwMj9JeoaV@d#%29v&aJzswuudVU1%nAT+rxS0Bh&OkgBYc0PH18*",
  });

  await wabe.start();
};

await run();
```

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
