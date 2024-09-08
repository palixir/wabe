# Create payment

With wabe, you have the ability to create payments either by using official adapters or by creating your own. You can then access it in the controllers object or create create payment with the default graphql mutation `createPayment`.

```ts
// With controller
const fn = async (context: WabeContext<any>) => {
  await context.wabe.controllers.payment.createPayment({
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

```graphql
// With graphql mutation
input CreatePaymentInput {
  customerEmail: Email
  paymentMode: PaymentMode!
  successUrl: String!
  cancelUrl: String!
  products: [CreatePaymentProductInput]!
  automaticTax: Boolean
  recurringInterval: PaymentReccuringInterval
}
"""
Create a payment with the payment provider. Returns the url to redirect the user to pay
"""
createPayment(input: CreatePaymentInput!): String
```

## Stripe adapter

You can easily initialize an adapter like this by passing your API key as a parameter to the adapter.

```ts
import { Wabe } from "wabe";
import { ResendAdapter } from "wabe-resend";

const run = async () => {
  const wabe = new Wabe({
    // ... others config fields
    payment: {
      adapter: new StripeAdapter('YOU_STRIPE_SECRET_KEY'),
      currency: 'usd',
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