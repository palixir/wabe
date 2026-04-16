# 📁 File Management with Wabe

Wabe provides comprehensive file management capabilities with seamless integration into the GraphQL API. Files can be uploaded, retrieved, and deleted through the API, with Wabe handling all storage operations automatically.

## ⚙️ Configuration

Wabe's file management system is highly configurable. You can specify storage adapters (like `Buns3Adapter` for S3-compatible storage) and implement hooks for preprocessing files before they are stored.

### Supported Storage Adapters

- **Buns3Adapter**: S3-compatible storage using Bun's built-in S3 client
- Custom adapters can be implemented by conforming to the `FileAdapter` interface

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
        databaseUrl: "mongodb://127.0.0.1:27045",
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

Using a URL to create a file (both `url` and `name` must be provided)

```graphql
mutation createUser($avatarUrl: String!, $avatarName: String!) {
  createUser(
    input: { fields: { avatar: { url: $avatarUrl, name: $avatarName } } }
  ) {
    user {
      id
      avatar {
        url
      }
    }
  }
}
```

## 🧩 TypeScript types

Wabe exposes two public types to describe a `File` field on both sides of the wire:

```ts
import type { WabeFile, WabeFileInput } from "wabe";

// Input: strict XOR union accepted by the DatabaseController and GraphQL.
// Either upload a binary File, or reference an external HTTPS URL (with a name) — never both.
type Input = WabeFileInput;
// = { file: File; url?: never; name?: never }
// | { file?: never; url: string; name: string }

// Output: shape stored in the database and returned by the DatabaseController
// or GraphQL after the upload hooks have resolved.
type Output = WabeFile;
// = {
//   name: string;           // canonical file name stored in the bucket
//   url?: string;           // presigned or external URL, refreshed by AfterRead
//   urlGeneratedAt?: Date;  // last time the URL was generated (cache window)
//   isPresignedUrl: boolean // true when the URL is a presigned bucket URL
// }
```

### Uploading via the DatabaseController

```ts
import type { WabeFileInput } from "wabe";

const payload: WabeFileInput = {
  file: new File(["hello"], "hello.txt", { type: "text/plain" }),
};

await wabe.controllers.database.createObject({
  className: "User",
  context: { isRoot: true, wabe },
  data: { avatar: payload },
  select: {},
});
```

Or with an external URL (must be HTTPS and not point to localhost). Both `url` and `name` are required:

```ts
import type { WabeFileInput } from "wabe";

const payload: WabeFileInput = {
  url: "https://cdn.example.com/logo.png",
  name: "logo.png",
};

await wabe.controllers.database.updateObject({
  className: "User",
  context: { isRoot: true, wabe },
  id: "userId",
  data: { avatar: payload },
  select: {},
});
```
