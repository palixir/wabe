import { Context } from 'wobe'

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
  created: string
  amount: number
  customerEmail: string | null
  billingDetails: {
    address: {
      city: string | null
      country: string | null
      line1: string | null
      line2: string | null
      postalCode: string | null
      state: string | null
    }
    name: string | null
    phone: string | null
  }
  currency: string
  paymentMethodTypes: Array<string>
}

export interface OnPaymentFailedOptions {
  created: string
  amount: number
  messageError: string
  paymentMethodTypes: Array<string>
}

export interface PaymentConfig {
  adapter: PaymentAdapter
  supportedPaymentMethods: Array<PaymentMethod>
  currency: Currency
  onPaymentSucceed?: (options: OnPaymentSucceedOptions) => Promise<void>
  onPaymentFailed?: (options: OnPaymentFailedOptions) => Promise<void>
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
   * Init the webhook for succeed and failed payments
   * @param options The webhook url
   */
  initWebhook: (options: InitWebhookOptions) => Promise<void>
}
