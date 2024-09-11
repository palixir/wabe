import { Stripe } from 'stripe'
import type {
  CancelSubscriptionOptions,
  CreateCustomerOptions,
  CreatePaymentOptions,
  Currency,
  GetAllTransactionsOptions,
  GetInvoicesOptions,
  GetTotalRevenueOptions,
  Invoice,
  PaymentAdapter,
  Transaction,
} from 'wabe'

export class StripeAdapter implements PaymentAdapter {
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

    if (!customer.email) throw new Error('Error creating Stripe customer')

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

  async getTotalRevenue({
    startRangeTimestamp,
    endRangeTimestamp,
    charge,
  }: GetTotalRevenueOptions) {
    const recursiveToGetTotalRevenue = async (
      totalRevenue = 0,
      idToStart?: string,
    ): Promise<number> => {
      const transactions = await this.stripe.balanceTransactions.list({
        limit: 100,
        starting_after: idToStart,
        created: {
          gte: startRangeTimestamp,
          lt: endRangeTimestamp,
        },
        type: charge === 'net' ? undefined : 'charge',
      })

      const newTotalRevenue = transactions.data.reduce((acc, transaction) => {
        return acc + transaction.amount
      }, totalRevenue)

      if (!transactions.has_more) return newTotalRevenue / 100

      const lastElement = transactions.data[transactions.data.length - 1]

      return recursiveToGetTotalRevenue(newTotalRevenue, lastElement.id)
    }

    return recursiveToGetTotalRevenue()
  }

  async getAllTransactions({
    startRangeTimestamp,
    endRangeTimestamp,
    first,
  }: GetAllTransactionsOptions) {
    const _getSubscriptionInterval = async (chargeId?: string) => {
      const invoice = await this.stripe.invoices.retrieve(chargeId || '')

      if (!invoice.subscription) return undefined

      const subscription = await this.stripe.subscriptions.retrieve(
        invoice.subscription?.toString() || '',
      )

      const intervalCount = subscription.items.data[0].plan.interval_count
      const interval = subscription.items.data[0].plan.interval

      return { intervalCount, interval }
    }

    const recursiveToGetAllTransactions = async (
      transactions: Transaction[] = [],
      idToStart?: string,
    ): Promise<Transaction[]> => {
      const charges = await this.stripe.charges.list({
        limit: !first || first > 100 ? 100 : first,
        created: {
          gte: startRangeTimestamp,
          lt: endRangeTimestamp,
        },
        starting_after: idToStart,
      })

      const newTransactions = (await Promise.all(
        charges.data.map(async (charge) => {
          const customer = (await this.stripe.customers.retrieve(
            charge.customer?.toString() || '',
          )) as Stripe.Customer

          const interval = await _getSubscriptionInterval(
            charge.invoice?.toString(),
          )

          return {
            customerEmail: customer.email,
            amount: charge.amount,
            currency: charge.currency as Currency,
            created: charge.created,
            isSubscription: !!interval,
            reccuringInterval: interval?.interval,
          }
        }),
      )) as Transaction[]

      const newArrayOfTransactions = [...transactions, ...newTransactions]

      if (!charges.has_more) return newArrayOfTransactions

      const lastElement = charges.data[charges.data.length - 1]

      return recursiveToGetAllTransactions(
        newArrayOfTransactions,
        lastElement.id,
      )
    }

    return recursiveToGetAllTransactions()
  }
}
