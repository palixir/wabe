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

export interface PaymentConfig {
  adapter: PaymentAdapter
  supportedPaymentMethods: Array<PaymentMethod>
  currency: Currency
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
