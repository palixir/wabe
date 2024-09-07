import { Stripe } from 'stripe'
import type {
  CancelSubscriptionOptions,
  CreateCustomerOptions,
  CreatePaymentOptions,
  Currency,
  GetInvoicesOptions,
  Invoice,
} from 'wabe'

export class StripeAdapter {
  private stripe: Stripe

  constructor(apiKey: string) {
    this.stripe = new Stripe(apiKey, {
      apiVersion: '2024-06-20',
      appInfo: {
        name: 'wabe',
      },
      typescript: true,
    })
  }

  async createCustomer({
    customerName,
    customerPhone,
    customerEmail,
    address: { city, country, line1, line2, postalCode, state },
    paymentMethod,
  }: CreateCustomerOptions) {
    const customer = await this.stripe.customers.create({
      email: customerEmail,
      address: {
        city,
        country,
        line1,
        line2,
        postal_code: postalCode,
        state,
      },
      name: customerName,
      phone: customerPhone,
      payment_method: paymentMethod,
    })

    return customer.email
  }

  async createPayment({
    customerEmail,
    paymentMode,
    paymentMethod,
    successUrl,
    cancelUrl,
    products,
    currency,
    automaticTax,
    recurringInterval,
  }: CreatePaymentOptions) {
    const customersWithSameEmail = await this.stripe.customers.list({
      email: customerEmail,
      limit: 1,
    })

    // If no customer found, Stripe will create one
    const customer = customersWithSameEmail.data?.[0]

    const lineItems = products.map(({ name, unitAmount, quantity }) => ({
      price_data: {
        currency,
        product_data: {
          name,
        },
        unit_amount: unitAmount,
        ...(paymentMode === 'subscription'
          ? {
              recurring: {
                interval: recurringInterval || 'month',
              },
            }
          : {}),
      },
      quantity,
    }))

    const session = await this.stripe.checkout.sessions.create({
      customer: customer?.id,
      line_items: lineItems,
      payment_method_types: paymentMethod,
      mode: paymentMode,
      success_url: successUrl,
      cancel_url: cancelUrl,
      automatic_tax: {
        enabled: !!automaticTax,
      },
    })

    if (!session.url) throw new Error('Error creating Stripe session')

    return session.url
  }

  async cancelSubscription({ email }: CancelSubscriptionOptions) {
    const customers = await this.stripe.customers.list({
      email,
      limit: 1,
    })

    const customer = customers.data?.[0]

    if (!customer) throw new Error('Customer not found')

    const subscriptions = await this.stripe.subscriptions.list({
      customer: customer.id,
      limit: 1,
    })

    const subscription = subscriptions.data?.[0]

    if (!subscription) throw new Error("Customer don't have any subscription")

    await this.stripe.subscriptions.cancel(subscription.id)
  }

  async getInvoices({ email }: GetInvoicesOptions): Promise<Invoice[]> {
    const customers = await this.stripe.customers.list({
      email,
      limit: 1,
    })

    const customer = customers.data?.[0]

    if (!customer) throw new Error('Customer not found')

    const invoices = await this.stripe.invoices.list({
      customer: customer.id,
      limit: 1,
    })

    const formatInvoices =
      invoices.data?.map((invoice) => ({
        amountDue: invoice.amount_due,
        amountPaid: invoice.amount_paid,
        currency: invoice.currency as Currency,
        id: invoice.id,
        created: invoice.created,
        invoiceUrl: invoice.hosted_invoice_url || '',
        isPaid: invoice.paid,
      })) || []

    return formatInvoices
  }
}
