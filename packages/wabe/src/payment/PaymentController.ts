import type {
  CancelSubscriptionOptions,
  CreateCustomerOptions,
  CreatePaymentOptions,
  GetInvoicesOptions,
  PaymentAdapter,
  PaymentConfig,
  GetTotalRevenueOptions,
  GetAllTransactionsOptions,
  GetCustomerByIdOptions,
  CreateCouponOptions,
  CreatePromotionCodeOptions,
  DeleteCouponOptions,
  UpdatePromotionCodeOptions,
} from './interface'

export class PaymentController implements PaymentAdapter {
  public adapter: PaymentAdapter
  private config: PaymentConfig

  constructor(paymentConfig: PaymentConfig) {
    this.adapter = paymentConfig.adapter
    this.config = paymentConfig
  }

  deleteCoupon(options: DeleteCouponOptions) {
    return this.adapter.deleteCoupon(options)
  }

  updatePromotionCode(options: UpdatePromotionCodeOptions) {
    return this.adapter.updatePromotionCode(options)
  }

  createCoupon(options: CreateCouponOptions) {
    return this.adapter.createCoupon(options)
  }

  createPromotionCode(options: CreatePromotionCodeOptions) {
    return this.adapter.createPromotionCode(options)
  }

  getCustomerById(options: GetCustomerByIdOptions) {
    return this.adapter.getCustomerById(options)
  }

  validateWebhook(ctx: any) {
    return this.adapter.validateWebhook(ctx)
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
