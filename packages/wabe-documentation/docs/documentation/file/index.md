# 📁 File Management with Wabe

Wabe allows you to store and manage files effortlessly, with full integration into the GraphQL API. You can upload, read, and delete files via the API, and Wabe will automatically handle storage and database operations behind the scenes—no extra setup required.

## ⚙️ Configuration

Wabe provides customizable options for file management. For instance, you can configure a storage adapter such as `Buns3Adapter` and define a `beforeUpload` hook to perform custom actions (e.g., encryption) before the file is saved.

### Example Setup

```ts
import { Wabe } from "wabe";
import { MongoAdapter } from "wabe-mongodb";
import { Buns3Adapter } from "wabe-buns3";

const run = async () => {
  // Ensure MongoDB is running before starting

  const wabe = new Wabe({
    isProduction: process.env.NODE_ENV === "production",

    // Root key (must be at least 64 characters long)
    rootKey:
      "0uwFvUxM$ceFuF1aEtTtZMa7DUN2NZudqgY5ve5W*QCyb58cwMj9JeoaV@d#%29v&aJzswuudVU1%nAT+rxS0Bh&OkgBYc0PH18*",

    database: {
      adapter: new MongoAdapter({
        databaseName: "WabeApp",
        url: "mongodb://127.0.0.1:27045",
      }),
    },

    file: {
      adapter: new Buns3Adapter({
        accessKeyId: "accessKeyId",
        secretAccessKey: "secretAccessKey",
        bucket: "bucketName",
        endpoint: "endpoint",
      }),

      urlCacheInSeconds: 3600 * 24, // 24 hours

      beforeUpload: (file: File, wabeContext: WabeContext) => {
        // Optional: encrypt or modify file before saving
        return file;
      },
    },

    port: 3001,
  });

  await wabe.start();

  // Upload a test file
  await wabe.controllers.file.uploadFile(new File(["test"], "test.txt"));

  // Retrieve the file URL
  const url = await wabe.controllers.file.readFile("test.txt");
};

await run();
```

## 🔗 GraphQL API

Wabe automatically exposes GraphQL endpoints for file operations including upload, read, and delete.

### 📥 Querying Files

Example: Retrieve file metadata (name and URL) from users:

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

### 📤 Uploading Files via GraphQL

Using a File object (Client-Side example)

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

const res = await fetch("http://127.0.0.1:3001/graphql", {
  method: "POST",
  body: formData,
});
```

Using a URL to create a file

```graphql
mutation createUser($avatarUrl: String!) {
  createUser(input: { fields: { avatar: { url: $avatarUrl } } }) {
    user {
      id
      avatar {
        url
      }
    }
  }
}
```
