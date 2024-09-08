import { describe, expect, it, mock } from 'bun:test'
import { cancelSubscriptionResolver } from './cancelSubscription'

describe('cancelSubscriptionResolver', () => {
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
      cancelSubscriptionResolver(null, {} as any, context as any),
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
      cancelSubscriptionResolver(null, {} as any, context as any),
    ).rejects.toThrow('Payment adapter not defined')
  })

  it("should call the payment controller's cancelSubscription method", async () => {
    const paymentController = {
      cancelSubscription: mock(() => {}),
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

    await cancelSubscriptionResolver(
      null,
      {
        input: {
          email: 'test@test.com',
        },
      },
      context as any,
    )

    expect(paymentController.cancelSubscription).toHaveBeenCalledTimes(1)
    expect(paymentController.cancelSubscription).toHaveBeenCalledWith({
      email: 'test@test.com',
    })
  })
})
