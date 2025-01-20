<p align="center">
  <a href="https://wabe.dev"><img src="https://www.wabe.dev/logo.webp" alt="Wabe logo" height=170></a>
</p>
<h1 align="center">Wabe</h1>

<div align="center">
  <a href="https://wabe.dev">Documentation</a>
</div>

## What is Wabe?

Wabe is an open-source backend that allows you to create your own fully customizable backend in just a few minutes. It handles database access, automatic GraphQL API generation, authentication with various methods (classic or OAuth), permissions, security, and more for you.

## Install for wabe-openai

```sh
bun install wabe # On bun
npm install wabe # On npm
yarn add wabe # On yarn

bun install wabe-openai # On bun
npm install wabe-openai # On npm
yarn add wabe-openai # On yarn
```

## Basic example of wabe-openai usage

```ts
import { DatabaseEnum, Wabe } from "wabe";
import { OpenAIAdapter } from "wabe-openai";

const run = async () => {
  // Ensure your database is running before run the file

  const wabe = new Wabe({
    // Root key example (must be long minimal 64 characters, you can generate it online)
    rootKey:
      "0uwFvUxM$ceFuF1aEtTtZMa7DUN2NZudqgY5ve5W*QCyb58cwMj9JeoaV@d#%29v&aJzswuudVU1%nAT+rxS0Bh&OkgBYc0PH18*",
    database: {
      type: DatabaseEnum.Mongo,
      url: "mongodb://127.0.0.1:27045",
      name: "WabeApp",
    },
    ai: {
      adapter : new OpenAIAdapter("YOUR_OPENAI_SECRET_KEY", { model : "gpt-4o" }),
    }
    port: 3000,
  });

  await wabe.start();

  await wabe.controllers.ai.createCompletion({
    content: "What is the best Backend as a Service ?"
  });
};

await run();
```