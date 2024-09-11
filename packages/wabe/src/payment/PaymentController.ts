import type {
  CancelSubscriptionOptions,
  CreateCustomerOptions,
  CreatePaymentOptions,
  GetInvoicesOptions,
  PaymentAdapter,
  PaymentConfig,
  GetTotalRevenueOptions,
} from './interface'

export class PaymentController implements PaymentAdapter {
  private adapter: PaymentAdapter
  private config: PaymentConfig

  constructor(paymentConfig: PaymentConfig) {
    this.adapter = paymentConfig.adapter
    this.config = paymentConfig
  }

  async createCustomer(options: CreateCustomerOptions) {
    return this.adapter.createCustomer(options)
  }

  async createPayment(
    options: Omit<CreatePaymentOptions, 'currency' | 'paymentMethod'>,
  ) {
    return this.adapter.createPayment({
      ...options,
      currency: this.config.currency,
      paymentMethod: this.config.supportedPaymentMethods,
    })
  }

  async cancelSubscription(options: CancelSubscriptionOptions) {
    return this.adapter.cancelSubscription(options)
  }

  async getInvoices(options: GetInvoicesOptions) {
    return this.adapter.getInvoices(options)
  }

  async getTotalRevenue(options: GetTotalRevenueOptions) {
    return this.adapter.getTotalRevenue(options)
  }
}
