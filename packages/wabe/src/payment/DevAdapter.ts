import type { PaymentAdapter } from './interface'

// @ts-expect-error
export class PaymentDevAdapter implements PaymentAdapter {
  // biome-ignore lint/suspicious/useAwait: false
  async getCustomerById() {
    return {
      email: 'customer@test.com',
    }
  }

  // biome-ignore lint/suspicious/useAwait: false
  async initWebhook() {
    return 'id'
  }
}
