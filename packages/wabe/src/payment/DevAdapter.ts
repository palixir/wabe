import type { PaymentAdapter } from './interface'

export class PaymentDevAdapter implements PaymentAdapter {
  // biome-ignore lint/suspicious/useAwait: false
  async getCustomerById() {
    return {
      email: 'customer@test.com',
    }
  }

  // biome-ignore lint/suspicious/useAwait: false
  async validateWebhook() {
    return { isValid: true, payload: { type: '' } }
  }

  // biome-ignore lint/suspicious/useAwait: false
  async createCustomer() {
    return ''
  }

  // biome-ignore lint/suspicious/useAwait: false
  async createPayment() {
    return ''
  }

  async cancelSubscription() {}

  // biome-ignore lint/suspicious/useAwait: false
  async getInvoices() {
    return []
  }

  // biome-ignore lint/suspicious/useAwait: false
  async getTotalRevenue() {
    return 0
  }

  // biome-ignore lint/suspicious/useAwait: false
  async getAllTransactions() {
    return []
  }

  // biome-ignore lint/suspicious/useAwait: false
  async getHypotheticalSubscriptionRevenue() {
    return 0
  }
}
