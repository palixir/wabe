# Make a payment

With wabe, you have the ability to create payments either by using official adapters or by creating your own. You can then access it in the controllers object.

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
    fields: ['id'],
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
    fields: [],
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

You can create your own adapter (for other payment providers) implementing the interface `PaymentAdapter` :

```ts
export type CreateCustomerOptions = {
  customerName?: string
  customerEmail: string
  customerPhone?: string
  address: Address
  paymentMethod: PaymentMethod
}

export type CreatePaymentOptions = {
  currency: Currency
  customerEmail: string
  products: Array<Product>
  paymentMethod: Array<PaymentMethod>
  paymentMode: PaymentMode
  successUrl: string
  cancelUrl: string
  automaticTax?: boolean
  recurringInterval?: 'month' | 'year'
}

export type CancelSubscriptionOptions = {
  email: string
}

export type GetInvoicesOptions = {
  email: string
}

export interface PaymentAdapter {
  /**
   * Create a customer
   * @param options CreateCustomerOptions
   * @returns The customer email
   */
  createCustomer: (options: CreateCustomerOptions) => Promise<string>
  /**
   * Create a payment
   * @param options CreatePaymentOptions
   * @returns The payment url
   */
  createPayment: (options: CreatePaymentOptions) => Promise<string>
  /**
   * Cancel a subscription
   * @param options The customer email to cancel the subscription
   */
  cancelSubscription: (options: CancelSubscriptionOptions) => Promise<void>
  /**
   * Get invoices
   * @param options The customer email to get the invoices
   * @returns The invoices of a customer
   */
  getInvoices: (options: GetInvoicesOptions) => Promise<Invoice[]>
}
```
