import type { Context } from 'wobe'

export enum Currency {
  EUR = 'eur',
  USD = 'usd',
}

export type Address = {
  city: string
  country: string
  line1: string
  line2: string
  postalCode: string
  state: string
}

export enum PaymentMode {
  Payment = 'payment',
  Subscription = 'subscription',
}

export type PaymentMethod =
  | 'card'
  | 'paypal'
  | 'link'
  | 'sepa_debit'
  | 'revolut_pay'
  | 'us_bank_account'

export enum PaymentReccuringInterval {
  Month = 'month',
  Year = 'year',
}

export type Product = {
  name: string
  unitAmount: number
  quantity: number
}

export interface OnPaymentSucceedOptions {
  createdAt: number
  amount: number
  customerEmail: string | null
  currency: string
  paymentMethodTypes: Array<string>
}

export interface OnPaymentFailedOptions {
  createdAt: number
  amount: number
  paymentMethodTypes: Array<string>
}

/**
 * PaymentConfig
 * @property adapter - The payment adapter
 * @property supportedPaymentMethods - The supported payment methods
 * @property currency - The currency
 * @property onPaymentSucceed - The callback function for when a payment is succeeded
 * @property onPaymentFailed - The callback function for when a payment is failed
 * @property linkPaymentWebhook - The webhook that link the payment on payment succeeded configuration
 * @property linkPaymentWebhook.secret - The webhook secret
 * @property linkPaymentWebhook.url - The webhook url (Default: /webhook/linkPayment)
 */
export interface PaymentConfig {
  adapter: PaymentAdapter
  supportedPaymentMethods: Array<PaymentMethod>
  currency: Currency
  onPaymentSucceed?: (options: OnPaymentSucceedOptions) => Promise<void>
  onPaymentFailed?: (options: OnPaymentFailedOptions) => Promise<void>
  linkPaymentWebhook?: {
    secret: string
    url?: string
  }
}

export type Invoice = {
  amountDue: number
  amountPaid: number
  currency: Currency
  id: string
  created: number
  invoiceUrl: string
  isPaid: boolean
}

export type Transaction = {
  customerEmail: string
  amount: number
  currency: Currency
  created: number
  isSubscription: boolean
  reccuringInterval?: 'month' | 'year'
}

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

export type InitWebhookOptions = {
  webhookUrl: string
}

export type CancelSubscriptionOptions = {
  email: string
}

export type GetInvoicesOptions = {
  email: string
}

export type GetTotalRevenueOptions = {
  startRangeTimestamp?: number
  endRangeTimestamp?: number
  charge: 'net' | 'gross'
}

export type GetAllTransactionsOptions = {
  startRangeTimestamp?: number
  endRangeTimestamp?: number
  first?: number
}

export type GetCustomerByIdOptions = {
  id: string
}

export type ValidateWebhookOptions = {
  ctx: Context
  endpointSecret: string
}

/**
 * ValidateWebhookOutput
 * @property valid - Whether the webhook is valid or not
 * @property payload - The payload of the webhook
 * @property type - The type of the webhook
 * @property customerId - The customer id
 * @property createdAt - The created at timestamp in seconds
 * @property currency - The currency
 * @property amount - The amount
 * @property paymentMethod - The payment method
 */
export type ValidateWebhookOutput = {
  isValid: boolean
  payload: {
    type: string
    customerId?: string
    createdAt?: number
    currency?: string
    amount?: number
    paymentMethod?: Array<string>
  }
}

export type InitWebhookOutput = {
  webhookId: string
  endpointSecret: string
}

export interface PaymentAdapter {
  /**
   * Get a customer by id
   * @param id The customer id
   * @returns The customer
   */
  getCustomerById: (
    options: GetCustomerByIdOptions,
  ) => Promise<{ email: string | null }>
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
  /**
   * Get total revenue
   * @param options The type of charge (net or gross) and the start and end range timestamps to get the total revenue
   * @returns The total amount
   */
  getTotalRevenue: (options: GetTotalRevenueOptions) => Promise<number>
  /**
   * Get the list of all transactions
   * @param options The start and end range timestamps to get the transactions
   * @returns The list of transactions
   */
  getAllTransactions: (
    options: GetAllTransactionsOptions,
  ) => Promise<Transaction[]>
  /**
   * Get the hypothetical revenue of subscriptions
   * @returns The hypothetical revenue of subscriptions
   */
  getHypotheticalSubscriptionRevenue: () => Promise<number>
  /**
   * Check if the request on webhook is from a valid provier
   * @param ctx The Wobe context of the request
   * @returns True if the request is from a valid provider, false otherwise
   */
  validateWebhook: (
    options: ValidateWebhookOptions,
  ) => Promise<ValidateWebhookOutput>
}
