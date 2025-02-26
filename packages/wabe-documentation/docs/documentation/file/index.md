# File

Wabe allow you to store files very easily, with a fully automatic integration in the GraphQL API. You can upload files, read them, and delete them. Wabe will automatically manage the files and the database, so you don't have to worry about it.

## Configuration

To configure your adapter you can for example use the `Buns3Adapter` :

```ts
import { DatabaseEnum, Wabe } from "wabe";
import { Buns3Adapter } from "wabe-buns3";

const run = async () => {
  // Ensure your database is running before run the file

  const wabe = new Wabe({
    isProduction: process.env.NODE_ENV === 'production',
    // Root key example (must be long minimal 64 characters, you can generate it online)
    rootKey:
      "0uwFvUxM$ceFuF1aEtTtZMa7DUN2NZudqgY5ve5W*QCyb58cwMj9JeoaV@d#%29v&aJzswuudVU1%nAT+rxS0Bh&OkgBYc0PH18*",
    database: {
      type: DatabaseEnum.Mongo,
      url: "mongodb://127.0.0.1:27045",
      name: "WabeApp",
    },
    file: {
      adapter : new Buns3Adapter({
        accessKeyId: 'accessKeyId',
         secretAccessKey: 'secretAccessKey',
         bucket: 'bucketName',
         endpoint: 'endpoint',
      }),
      urlCacheInSeconds: 3600 * 24, // 24 hours
    }
    port: 3000,
  });

  await wabe.start();

  await wabe.controllers.file.uploadFile(new File(['test'], 'test.txt'));

  const url = await wabe.controllers.file.readFile('test.txt');
};

await run();
```

## GraphQL API

The GraphQL API automatically manages the upload, the read and the delete of the files. You can use it like this :

```graphql
query users {
  users {
    edges {
      node {
        id
        avatar {
          name # The name of the file
          url # The url of the file
        }
      }
    }
  }
}
```

Example to create a file providing a File object :

```ts
const formData = new FormData();

formData.append(
  "operations",
  JSON.stringify({
    query: `mutation (avatar: File!) {
        updateUser(input: {id: \"userId\", fields: {avatar: $avatar}}) {
          user {
            id
            avatar {
              url
            }
          }
        }
      }`,
    variables: { avatar: null },
  }),
);

formData.append("map", JSON.stringify({ 0: ["variables.avatar"] }));

formData.append("0", new File(["a"], "a.text", { type: "text/plain" }));

const res = await fetch("http://127.0.0.1:3000/graphql", {
  method: "POST",
  body: formData,
});
```

Example to create a file providing an url :

```graphql
mutation createUser ($avatarUrl: String!) {
  createUser(input: { fields: {avatar: {url: $avatarUrl}}}) {
    user {
      id
      avatar {
        url
      }
    }
  }
}
```
