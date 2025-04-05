<p align="center">
  <a href="https://wabe.dev"><img src="https://wabe.dev/assets/logo.png" alt="Wabe logo" height=170></a>
</p>

<div align="center">
  <a href="https://wabe.dev">Documentation</a>
</div>

## What is Wabe?

Wabe is an open-source backend as a service that allows you to create your own fully customizable backend in just a few minutes. It handles database access, automatic GraphQL API generation, authentication with various methods (classic or OAuth), permissions, security, and more for you.

## Install for wabe-mistralai

```sh
bun install wabe # On bun
npm install wabe # On npm
yarn add wabe # On yarn

bun install wabe-mistralai # On bun
npm install wabe-mistralai # On npm
yarn add wabe-mistralai # On yarn
```

## Basic example of wabe-mistralai usage

```ts
import { Wabe } from "wabe";
import { MongoAdapter } from "wabe-mongodb"
import { MistralAIAdapter } from "wabe-mistralai";

const run = async () => {
  // Ensure your database is running before run the file

  const wabe = new Wabe({
    isProduction: process.env.NODE_ENV === 'production',
    // Root key example (must be long minimal 64 characters, you can generate it online)
    rootKey:
      "0uwFvUxM$ceFuF1aEtTtZMa7DUN2NZudqgY5ve5W*QCyb58cwMj9JeoaV@d#%29v&aJzswuudVU1%nAT+rxS0Bh&OkgBYc0PH18*",
    database: {
      adapter: new MongoAdapter({
        databaseName: "WabeApp",
        url: "mongodb://127.0.0.1:27045",
      })
    },
    ai: {
      adapter : new MistralAIAdapter("YOUR_MISTRAL_SECRET_KEY"),
    }
    port: 3001,
  });

  await wabe.start();

  await wabe.controllers.ai.createCompletion({
    content: "What is the best Backend as a Service ?"
  });
};

await run();
```
