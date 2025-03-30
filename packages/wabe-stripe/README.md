<p align="center">
  <a href="https://wabe.dev"><img src="https://wabe.dev/assets/logo.png" alt="Wabe logo" height=170></a>
</p>

<div align="center">
  <a href="https://wabe.dev">Documentation</a>
</div>

## What is Wabe?

Wabe is an open-source backend as a service that allows you to create your own fully customizable backend in just a few minutes. It handles database access, automatic GraphQL API generation, authentication with various methods (classic or OAuth), permissions, security, and more for you.

## Install for wabe-stripe

```sh
bun install wabe # On bun
npm install wabe # On npm
yarn add wabe # On yarn

bun install wabe-stripe # On bun
npm install wabe-stripe # On npm
yarn add wabe-stripe # On yarn
```

## Basic example of wabe-stripe usage

```ts
import { Wabe, PaymentMode, Currency } from "wabe";
import { MongoAdapter } from "wabe-mongodb"
import { StripeAdapter } from "wabe-stripe";

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
    payment: {
      adapter: new StripeAdapter('YOU_STRIPE_SECRET_KEY'),
      currency: Currency.USD,
      supportedPaymentMethods: ['card', 'paypal'],
    },
    port: 3000,
  });

  await wabe.start();

  await wabe.controllers.payment.createPayment({
      cancelUrl: 'https://example.com/cancel',
      successUrl: 'https://example.com/success',
      customerEmail: 'john.doe@example.com',
      paymentMode: PaymentMode.Subscription,
      // Compute the taxe automatically or not
      automaticTax: true,
      recurringInterval: 'month',
      products: [{ name: 'MacBook Pro', unitAmount: 100, quantity: 1 }],
  })
};

await run();
```
