import { describe, expect, it, mock, afterEach } from 'bun:test'
import { linkPayment } from './linkPayment'

describe('linkPayment', () => {
  const mockGetObjects = mock(() => {})
  const mockCreateObject = mock(() => {})

  afterEach(() => {
    mockGetObjects.mockClear()
    mockCreateObject.mockClear()
  })

  it('should link a payment to a user', async () => {
    const context = {
      wabe: {
        controllers: {
          database: {
            getObjects: mockGetObjects,
            createObject: mockCreateObject,
          },
        },
      },
    } as any

    mockGetObjects.mockResolvedValueOnce([{ id: 'userId' }] as never)
    mockCreateObject.mockResolvedValueOnce({} as never)

    await linkPayment(context, 'email@test.fr', 1, 'eur')

    expect(mockGetObjects).toHaveBeenCalledTimes(1)
    expect(mockGetObjects).toHaveBeenCalledWith({
      className: 'User',
      context: {
        isRoot: true,
        wabe: expect.any(Object),
      },
      fields: ['id'],
      where: {
        email: {
          equalTo: 'email@test.fr',
        },
      },
      first: 1,
    })

    expect(mockCreateObject).toHaveBeenCalledTimes(1)
    expect(mockCreateObject).toHaveBeenCalledWith({
      className: 'Payment',
      context: {
        isRoot: true,
        wabe: expect.any(Object),
      },
      data: {
        user: 'userId',
        amount: 1,
        currency: 'eur',
      },
      fields: [],
    })
  })
})
