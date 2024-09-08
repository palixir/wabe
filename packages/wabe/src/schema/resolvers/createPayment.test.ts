import { describe, expect, it, mock } from 'bun:test'
import { createPaymentResolver } from './createPayment'
import { PaymentMode } from '../../payment'

describe('createPaymentResolver', () => {
  it('should throw an error if the user is not authenticated', async () => {
    const context = {
      user: null,
      isRoot: false,
      wabe: {
        controllers: {
          payment: null,
        },
      },
    }

    expect(
      createPaymentResolver(null, {} as any, context as any),
    ).rejects.toThrow('Permission denied')
  })

  it('should throw an error if the payment controller is not defined', async () => {
    const context = {
      user: {
        id: '123',
        email: 'test@test.com',
      },
      isRoot: false,
      wabe: {
        controllers: {
          payment: null,
        },
      },
    }

    expect(
      createPaymentResolver(null, {} as any, context as any),
    ).rejects.toThrow('Payment adapter not defined')
  })

  it("should call the payment controller's createPayment method", async () => {
    const paymentController = {
      createPayment: mock(() => {}),
    }

    const context = {
      user: {
        id: '123',
        email: 'test@test.com',
      },
      isRoot: false,
      wabe: {
        controllers: {
          payment: paymentController,
        },
      },
    }

    await createPaymentResolver(
      null,
      {
        input: {
          customerEmail: 'test@test.com',
          paymentMode: PaymentMode.Payment,
          successUrl: 'https://example.com',
          cancelUrl: 'https://example.com',
          automaticTax: true,
        },
      },
      context as any,
    )

    expect(paymentController.createPayment).toHaveBeenCalledTimes(1)
    expect(paymentController.createPayment).toHaveBeenCalledWith({
      customerEmail: 'test@test.com',
      paymentMode: PaymentMode.Payment,
      successUrl: 'https://example.com',
      cancelUrl: 'https://example.com',
      automaticTax: true,
      recurringInterval: 'month',
    })
  })
})
