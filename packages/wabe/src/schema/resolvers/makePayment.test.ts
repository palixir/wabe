import { describe, expect, it, mock, afterEach } from 'bun:test'
import { makePaymentResolver } from './makePayment'
import { PaymentMode } from '../../payment'

describe('createPaymentResolver', () => {
  const mockGetObjects = mock(() => {})

  afterEach(() => {
    mockGetObjects.mockClear()
  })

  it('should throw an error if the customer email is not provided', async () => {
    const paymentController = {
      createPayment: mock(() => {}),
    }

    const context = {
      user: {
        id: '123',
        email: undefined,
      },
      isRoot: false,
      wabe: {
        controllers: {
          payment: paymentController,
        },
      },
    }

    expect(
      makePaymentResolver(null, { input: {} } as any, context as any),
    ).rejects.toThrow('Customer email is required')
  })

  it('should throw an error if the user is not authenticated', () => {
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
      makePaymentResolver(null, {} as any, context as any),
    ).rejects.toThrow('Permission denied')
  })

  it('should throw an error if the payment controller is not defined', () => {
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
      makePaymentResolver(null, {} as any, context as any),
    ).rejects.toThrow('Payment adapter not defined')
  })

  it("should call the payment controller's createPayment method", async () => {
    const paymentController = {
      createPayment: mock(() => {}),
    }

    mockGetObjects.mockResolvedValueOnce([{ id: 'userId' }] as never)

    const context = {
      user: {
        id: '123',
        email: 'test@test.com',
      },
      isRoot: false,
      wabe: {
        controllers: {
          payment: paymentController,
          database: {
            getObjects: mockGetObjects,
          },
        },
      },
    }

    await makePaymentResolver(
      null,
      {
        input: {
          products: [{ name: 'product1', unitAmount: 100, quantity: 1 }],
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
      products: [{ name: 'product1', unitAmount: 100, quantity: 1 }],
    })
  })

  it('should throw an error if the user is not found', async () => {
    const paymentController = {
      createPayment: mock(() => {}),
    }

    mockGetObjects.mockResolvedValueOnce([] as never)

    const context = {
      user: {
        id: '123',
        email: 'test@test.com',
      },
      isRoot: false,
      wabe: {
        controllers: {
          payment: paymentController,
          database: {
            getObjects: mockGetObjects,
          },
        },
      },
    }

    expect(
      makePaymentResolver(
        null,
        {
          input: {
            products: [{ name: 'product1', unitAmount: 100, quantity: 1 }],
            customerEmail: 'test@test.com',
            paymentMode: PaymentMode.Payment,
            successUrl: 'https://example.com',
            cancelUrl: 'https://example.com',
            automaticTax: true,
          },
        },
        context as any,
      ),
    ).rejects.toThrow('User not found')
  })
})
