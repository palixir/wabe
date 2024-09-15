import type {
  CancelSubscriptionOptions,
  CreateCustomerOptions,
  CreatePaymentOptions,
  GetInvoicesOptions,
  PaymentAdapter,
  PaymentConfig,
  GetTotalRevenueOptions,
  GetAllTransactionsOptions,
  InitWebhookOptions,
} from './interface'

export class PaymentController implements PaymentAdapter {
  private adapter: PaymentAdapter
  private config: PaymentConfig

  constructor(paymentConfig: PaymentConfig) {
    this.adapter = paymentConfig.adapter
    this.config = paymentConfig
  }

  async initWebhook({ webhookUrl }: InitWebhookOptions) {
    return this.adapter.initWebhook({
      webhookUrl,
    })
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

  async getAllTransactions(options: GetAllTransactionsOptions) {
    return this.adapter.getAllTransactions(options)
  }

  async getHypotheticalSubscriptionRevenue() {
    return this.adapter.getHypotheticalSubscriptionRevenue()
  }
}
