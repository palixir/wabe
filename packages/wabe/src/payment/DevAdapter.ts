import type { PaymentAdapter } from './interface'

export class PaymentDevAdapter implements PaymentAdapter {
  // biome-ignore lint/suspicious/useAwait: false
  async getCustomerById() {
    return {
      email: 'customer@test.com',
    }
  }

  // @ts-expect-error
  // biome-ignore lint/suspicious/useAwait: false
  async validateWebhook() {
    return { isValid: true, payload: {} }
  }
}
