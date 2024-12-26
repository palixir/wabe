import { Stripe } from 'stripe'
import {
  type CancelSubscriptionOptions,
  type ValidateWebhookOptions,
  type ValidateWebhookOutput,
  type CreateCustomerOptions,
  type CreatePaymentOptions,
  type Currency,
  type GetAllTransactionsOptions,
  type GetCustomerByIdOptions,
  type GetInvoicesOptions,
  type GetTotalRevenueOptions,
  type CreateCouponOptions,
  type Invoice,
  type PaymentAdapter,
  type Transaction,
  PaymentMode,
  type CreatePromotionCodeOptions,
  type DeleteCouponOptions,
  type UpdatePromotionCodeOptions,
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

  async deleteCoupon({ id }: DeleteCouponOptions) {
    await this.stripe.coupons.del(id)
  }

  async updatePromotionCode({ id, active }: UpdatePromotionCodeOptions) {
    await this.stripe.promotionCodes.update(id, { active })
  }

  async createCoupon({
    amountOff,
    currency,
    duration,
    durationInMonths,
    name,
    percentOff,
    maxRedemptions,
  }: CreateCouponOptions) {
    const coupon = await this.stripe.coupons.create({
      amount_off: amountOff,
      currency,
      duration,
      duration_in_months: durationInMonths,
      max_redemptions: maxRedemptions,
      name,
      percent_off: percentOff,
    })

    if (!coupon.id) throw new Error('Error creating Stripe coupon')

    return coupon.id
  }

  async createPromotionCode({
    couponId,
    code,
    active,
    maxRedemptions,
  }: CreatePromotionCodeOptions) {
    const promotionCode = await this.stripe.promotionCodes.create({
      coupon: couponId,
      code,
      active,
      max_redemptions: maxRedemptions,
    })

    if (!promotionCode.id)
      throw new Error('Error creating Stripe promotion code')

    return { code: promotionCode.code, id: promotionCode.id }
  }

  async getCustomerById({ id }: GetCustomerByIdOptions) {
    const customer = (await this.stripe.customers.retrieve(
      id,
    )) as Stripe.Customer

    return {
      email: customer.email,
    }
  }

  async _streamToString(stream: ReadableStream<Uint8Array>) {
    // Create a new TextDecoder instance to decode UTF-8 encoded data
    const decoder = new TextDecoder('utf-8')
    let result = ''

    // Get a reader from the stream
    const reader = stream.getReader()

    while (true) {
      // Read from the stream
      const { done, value } = await reader.read()

      // Exit loop if there's no more data
      if (done) break

      // Decode and append the chunk to the result
      result += decoder.decode(value, { stream: true })
    }

    // Return the final result
    return result
  }

  async validateWebhook({
    ctx,
    endpointSecret,
  }: ValidateWebhookOptions): Promise<ValidateWebhookOutput> {
    const stripeSignature = ctx.request.headers.get('stripe-signature')

    const body = ctx.request.body

    if (!body || !stripeSignature)
      return {
        isValid: false,
        type: '',
        payload: null,
      }

    try {
      const event = await this.stripe.webhooks.constructEventAsync(
        await this._streamToString(body),
        stripeSignature,
        endpointSecret,
      )

      return {
        isValid: true,
        type: event.type,
        payload: event.data.object as any,
      }
    } catch {
      return {
        isValid: false,
        type: '',
        payload: null,
      }
    }
  }

  async createCustomer({
    customerName,
    customerPhone,
    customerEmail,
    address: { city, country, line1, line2, postalCode, state },
    paymentMethod,
  }: CreateCustomerOptions) {
    const paymentMethods = await this.stripe.paymentMethods.list({
      type: paymentMethod,
    })

    const paymentMethodId = paymentMethods.data?.[0]?.id

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
      payment_method: paymentMethodId,
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
    createInvoice = true,
    allowPromotionCode = true,
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
        ...(paymentMode === PaymentMode.subscription
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
      customer: customerEmail ? customer?.id : undefined,
      line_items: lineItems,
      payment_method_types: paymentMethod,
      mode: paymentMode,
      success_url: successUrl,
      cancel_url: cancelUrl,
      automatic_tax: {
        enabled: !!automaticTax,
      },
      invoice_creation: {
        enabled: createInvoice,
      },
      allow_promotion_codes: allowPromotionCode,
      ...(automaticTax
        ? {
            billing_address_collection: 'required',
            shipping_address_collection: {
              allowed_countries: [],
            },
          }
        : {}),
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

      if (!transactions.has_more) return newTotalRevenue

      const lastElement = transactions.data[transactions.data.length - 1]

      return recursiveToGetTotalRevenue(newTotalRevenue, lastElement.id)
    }

    return recursiveToGetTotalRevenue()
  }

  // biome-ignore lint/suspicious/useAwait: false
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

  async getHypotheticalSubscriptionRevenue() {
    const recursiveGetSubscriptionRevenue = async (
      totalRevenue = 0,
      idToStart?: string,
    ): Promise<number> => {
      const subscriptions = await this.stripe.subscriptions.list({
        status: 'active',
        limit: 100,
        starting_after: idToStart,
      })

      const newTotalRevenue = subscriptions.data.reduce((acc, subscription) => {
        return acc + (subscription.items.data[0].plan.amount || 0)
      }, totalRevenue)

      if (!subscriptions.has_more) return newTotalRevenue

      const lastElement = subscriptions.data[subscriptions.data.length - 1]

      return recursiveGetSubscriptionRevenue(newTotalRevenue, lastElement.id)
    }

    return recursiveGetSubscriptionRevenue()
  }
}
