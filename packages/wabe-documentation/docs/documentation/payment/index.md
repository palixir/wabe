# Use payments provider

With wabe, you have the ability to create payments either by using official adapters or by creating your own. You can then access it in the controllers object.

## Initialize payment adapter


```ts
import { DatabaseEnum, Wabe, PaymentMode, Currency } from "wabe";
import { StripeAdapter } from "wabe-stripe";

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
    payment: {
      adapter: new StripeAdapter('YOU_STRIPE_SECRET_KEY'),
      currency: Currency.USD,
      supportedPaymentMethods: ['card', 'paypal'],
    },
    port: 3000,
  });

  await wabe.start();
};

await run();
```

## Use payments with controller

```ts
// With controller
const fn = async (context: WabeContext<any>) => {
  await context.wabe.controllers.payment.makePayment({
      cancelUrl: 'https://example.com/cancel',
      successUrl: 'https://example.com/success',
      customerEmail: 'john.doe@example.com',
      paymentMode: PaymentMode.Subscription,
      // Compute the taxe automatically or not
      automaticTax: true,
      recurringInterval: 'month',
      products: [{ name: 'MacBook Pro', unitAmount: 100, quantity: 1 }],
  })
}
```

## Cancel subscription

You can cancel a subscription using the `cancelSubscription` method.

```ts
const fn = async (context: WabeContext<any>) => {
  await context.wabe.controllers.payment.cancelSubscription({
    email: 'john.doe@example.com',
  })
}
```

## Get invoices

You can get the invoices of a customer using the `getInvoices` method.

```ts
const fn = async (context: WabeContext<any>) => {
  const invoices = await context.wabe.controllers.payment.getInvoices({
    email: 'john.doe@example.com',
  })
}
```

## Coupons

You can create a coupon using the `createCoupon` method.

```ts
const fn = async (context: WabeContext<any>) => {
  const {code, id: stripeId} = await context.wabe.controllers.payment.createCoupon({
    duration: 'repeating',
    durationInMonths: 3,
    name: 'MYCOUPON',
    percentOff: 10,
  })
}
```

Or with fixed amount:

```ts
const fn = async (context: WabeContext<any>) => {
  const {code, id: stripeId} = await context.wabe.controllers.payment.createCoupon({
    duration: 'forever',
    currency: Currency.EUR,
    amountOff: 100,
    name: 'MYCOUPON',
  })
}
```

## Promotion Codes

You can create a promotion code from a coupon using the `createPromotionCode` method.

```ts
const fn = async (context: WabeContext<any>) => {
  const {code, id: stripeId} = await context.wabe.controllers.payment.createPromotionCode({
    couponId: 'coupon_123',
    code: 'MYCODE',
  })
}
```

## Webhooks

You can create your own webhooks for payment. See below for an example of a webhook to create an object payment for each successful payment. You just need to add a route in the `routes` field of the Wabe config.

```ts

export const linkPayment = async ({
  context,
  email,
  amount,
  currency,
}: {
  context: WabeContext<BackTypes>
  email: string
  amount: number
  currency: string
}) => {
  const user = await context.wabe.controllers.database.getObjects({
    className: 'User',
    context: {
      ...context,
      isRoot: true,
    },
    select: {id :true},
    where: {
      email: {
        equalTo: email,
      },
    },
    first: 1,
  })

  if (user.length === 0) return

  const userId = user[0].id

  await context.wabe.controllers.database.createObject({
    className: 'Payment',
    context: {
      ...context,
      isRoot: true,
    },
    data: {
      user: userId,
      amount,
      currency,
    },
    select: {},
  })
}

export const linkPaymentRoute: WabeRoute = {
  method: 'POST',
  path: '/webhook/linkPayment',
  handler: async (context) => {
    const paymentController = context.wabe.wabe.controllers.payment
    if (!paymentController)
      return context.res.send('No payment controller', {
        status: 400,
      })

    const endpointSecret = 'yourEndpointSecret'

    if (!endpointSecret)
      return context.res.send('Bad request', {
        status: 400,
      })

    const { payload, isValid } = await paymentController.validateWebhook({
      ctx: context,
      endpointSecret,
    })

    if (!isValid)
      return context.res.send('Invalid webhook', {
        status: 400,
      })

    switch (payload.type) {
      case 'payment_intent.succeeded': {
        const res =
          await context.wabe.wabe.controllers.payment?.getCustomerById({
            id: payload.customerId || '',
          })

        const customerEmail = res?.email || ''

        if (customerEmail)
          await linkPayment({
            context: context.wabe,
            email: customerEmail,
            amount: payload.amount || 0,
            currency: payload.currency || '',
          })

        break
      }
      default:
        break
    }

    return context.res.sendJson({ received: true })
  },
}

```

## Stripe adapter

You can easily initialize an adapter like this by passing your API key as a parameter to the adapter.

```ts
import { Wabe, Currency } from "wabe";
import { StripeAdapter } from "wabe-stripe";

const run = async () => {
  const wabe = new Wabe({
    // ... others config fields
    payment: {
      adapter: new StripeAdapter('YOU_STRIPE_SECRET_KEY'),
      currency: Currency.USD,
      supportedPaymentMethods: ['card', 'paypal'],
    },
  });

  await wabe.start();
};

await run();
```

## Create your own adapter

You can create your own adapter (for other payment providers) implementing the interface `PaymentAdapter` [here](https://github.com/palixir/wabe/blob/main/packages/wabe/src/payment/interface.ts)
