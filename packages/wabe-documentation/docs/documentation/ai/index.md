# Use AI model

With Wabe, you have the ability to use some AI models like OpenAI either by using official adapters or by creating your own. You can then access it in your controllers or send an email using the GraphQL sendEmail mutation.

## Initialize the adapter

```ts
import { Wabe } from "wabe";
import { MongoAdapter } from "wabe-mongodb"
import { OpenAIAdapter } from "wabe-openai";

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
      adapter : new OpenAIAdapter("YOUR_OPENAI_SECRET_KEY", { model : "gpt-4o" }),
    }
    port: 3001,
  });

  await wabe.start();
};

await run();
```

## Use controller

```ts
// With controller
const fn = async (context: WabeContext<any>) => {
 await context.wabe.controllers.ai.createCompletion({
   content: "What is the best Backend as a Service ?"
 });
}
```

## OpenAI adapter

You can easily initialize an adapter like this by passing your API key as a parameter to the adapter.

```ts
import { Wabe } from "wabe";
import { OpenAIAdapter } from "wabe-openai";

const run = async () => {
  const wabe = new Wabe({
    // ... others config fields
    email: {
      adapter: new OpenAIAdapter("API_KEY"),
    },
  });

  await wabe.start();
};

await run();
```

## Create your own adapter

You can create your own adapter implementing the interface [here](https://github.com/palixir/wabe/blob/main/packages/wabe/src/ai/interface.ts)
