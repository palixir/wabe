# Use email adapter

With Wabe, you have the ability to send emails either by using official adapters or by creating your own. You can then access it in your controllers or send an email using the GraphQL sendEmail mutation.

## Initialize email adapter

```ts
import { DatabaseEnum, Wabe } from "wabe";
import { ResendAdapter } from "wabe-resend";

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
    email: {
      adapter : new ResendAdapter("YOUR_RESEND_API_KEY"),
    }
    port: 3000,
  });

  await wabe.start();


};

await run();
```

## Use email with controller

```ts
// With controller
const fn = async (context: WabeContext<any>) => {
  await context.wabe.controllers.email.send({
    from : "test@test.com",
    to: ["target@gmail.com"],
    subject: "Test",
    text: "Test",
  });
}
```

## Template configuration

You can provided your own html templates that Wabe can use to send emails provided by Wabe like `sendOTPCode` (with mutation sendOTPCode). If you don't provide your own templates, Wabe will use the default ones.

```ts
import { Wabe } from "wabe";
import { ResendAdapter } from "wabe-resend";

const run = async () => {
  const wabe = new Wabe({
    // ... others config fields
    email: {
      adapter: new ResendAdapter("API_KEY"),
      mainEmail: 'support@yourcompany.com',
      htmlTemplates: {
        sendOTPCode: (payload: any) =>
          `<h1>Hello ${payload.name}</h1><p>You have a new confirmation code: ${payload.code}</p>`,
      }
    },
  });

  await wabe.start();
};

await run();
```

## Resend adapter

You can easily initialize an adapter like this by passing your API key as a parameter to the adapter.

```ts
import { Wabe } from "wabe";
import { ResendAdapter } from "wabe-resend";

const run = async () => {
  const wabe = new Wabe({
    // ... others config fields
    email: {
      adapter: new ResendAdapter("API_KEY"),
    },
  });

  await wabe.start();
};

await run();
```

## Create your own adapter

You can create your own adapter implementing the interface  [here](https://github.com/palixir/wabe/blob/main/packages/wabe/src/email/interface.ts)
