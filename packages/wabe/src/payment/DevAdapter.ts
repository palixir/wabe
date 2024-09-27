import type { PaymentAdapter } from './interface'

// @ts-expect-error
export class PaymentDevAdapter implements PaymentAdapter {
  async getCustomerById() {
    return {
      email: 'customer@test.com',
    }
  }

  async initWebhook() {}
}
