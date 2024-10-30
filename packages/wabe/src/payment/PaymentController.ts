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
  GetCustomerByIdOptions,
} from './interface'

export class PaymentController implements PaymentAdapter {
  private adapter: PaymentAdapter
  private config: PaymentConfig

  constructor(paymentConfig: PaymentConfig) {
    this.adapter = paymentConfig.adapter
    this.config = paymentConfig
  }

  getCustomerById(options: GetCustomerByIdOptions) {
    return this.adapter.getCustomerById(options)
  }

  initWebhook({ webhookUrl }: InitWebhookOptions) {
    return this.adapter.initWebhook({
      webhookUrl,
    })
  }

  deleteWebhook(webhookId: string) {
    return this.adapter.deleteWebhook(webhookId)
  }

  createCustomer(options: CreateCustomerOptions) {
    return this.adapter.createCustomer(options)
  }

  createPayment(
    options: Omit<CreatePaymentOptions, 'currency' | 'paymentMethod'>,
  ) {
    return this.adapter.createPayment({
      ...options,
      currency: this.config.currency,
      paymentMethod: this.config.supportedPaymentMethods,
    })
  }

  cancelSubscription(options: CancelSubscriptionOptions) {
    return this.adapter.cancelSubscription(options)
  }

  getInvoices(options: GetInvoicesOptions) {
    return this.adapter.getInvoices(options)
  }

  getTotalRevenue(options: GetTotalRevenueOptions) {
    return this.adapter.getTotalRevenue(options)
  }

  getAllTransactions(options: GetAllTransactionsOptions) {
    return this.adapter.getAllTransactions(options)
  }

  getHypotheticalSubscriptionRevenue() {
    return this.adapter.getHypotheticalSubscriptionRevenue()
  }
}
