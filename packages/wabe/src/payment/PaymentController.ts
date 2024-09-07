import type {
  CancelSubscriptionOptions,
  CreateCustomerOptions,
  CreatePaymentOptions,
  GetInvoicesOptions,
  PaymentAdapter,
} from './interface'

export class PaymentController implements PaymentAdapter {
  private adapter: PaymentAdapter

  constructor(adapter: PaymentAdapter) {
    this.adapter = adapter
  }

  async createCustomer(options: CreateCustomerOptions) {
    return this.adapter.createCustomer(options)
  }

  async createPayment(options: CreatePaymentOptions) {
    return this.adapter.createPayment(options)
  }

  async cancelSubscription(options: CancelSubscriptionOptions) {
    return this.adapter.cancelSubscription(options)
  }

  async getInvoices(options: GetInvoicesOptions) {
    return this.adapter.getInvoices(options)
  }
}
