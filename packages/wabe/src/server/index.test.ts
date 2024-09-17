import { describe, expect, it, spyOn, mock } from 'bun:test'
import { v4 as uuid } from 'uuid'
import getPort from 'get-port'
import { Wabe } from '.'
import { DatabaseEnum } from '../database'
import { Schema } from '../schema'
import { OperationType } from '../hooks'

describe('Server', () => {
  it('should run server', async () => {
    const databaseId = uuid()

    const port = await getPort()
    const wabe = new Wabe({
      rootKey:
        'eIUbb9abFa8PJGRfRwgiGSCU0fGnLErph2QYjigDRjLsbyNA3fZJ8Npd0FJNzxAc',
      database: {
        type: DatabaseEnum.Mongo,
        url: 'mongodb://127.0.0.1:27045',
        name: databaseId,
      },
      port,
      schema: {
        classes: [
          {
            name: 'Collection1',
            fields: { name: { type: 'String' } },
          },
        ],
      },
    })

    await wabe.start()

    const res = await fetch(`http://127.0.0.1:${port}/health`)

    expect(res.status).toEqual(200)
    await wabe.close()
  })

  it('should call the onPaymentSucceed hook', async () => {
    const databaseId = uuid()
    const port = await getPort()

    const mockOnPaymentSucceed = mock(() => {})

    const wabe = new Wabe({
      rootKey:
        'eIUbb9abFa8PJGRfRwgiGSCU0fGnLErph2QYjigDRjLsbyNA3fZJ8Npd0FJNzxAc',
      publicUrl: 'http://127.0.0.1',
      database: {
        type: DatabaseEnum.Mongo,
        url: 'mongodb://127.0.0.1:27045',
        name: databaseId,
      },
      port,
      payment: {
        // @ts-expect-error
        onPaymentSucceed: async (options: any) => mockOnPaymentSucceed(options),
      } as any,
    })

    await wabe.start()

    await fetch(`http://127.0.0.1:${port}/webhooks/payment`, {
      method: 'POST',
      body: JSON.stringify({
        type: 'payment_intent.succeeded',
        created: 'created',
        data: {
          object: {
            amount: 100,
            currency: 'eur',
            customer: 'customerId',
            payment_method_types: ['card'],
            shipping: {
              address: {
                city: 'Paris',
                country: 'France',
                line1: '1 rue de la Paix',
                line2: '75008 Paris',
                postalCode: '75008',
                state: 'Paris',
              },
              name: 'John Doe',
              phone: '+33612345678',
            },
          },
        },
      }),
    })

    expect(mockOnPaymentSucceed).toHaveBeenCalledTimes(1)
    expect(mockOnPaymentSucceed).toHaveBeenCalledWith({
      created: 'created',
      amount: 1,
      customerEmail: '',
      billingDetails: {
        address: {
          city: 'Paris',
          country: 'France',
          line1: '1 rue de la Paix',
          line2: '75008 Paris',
          postalCode: '75008',
          state: 'Paris',
        },
        name: 'John Doe',
        phone: '+33612345678',
      },
      currency: 'eur',
      paymentMethodTypes: ['card'],
    })

    await wabe.close()
  })

  it('should call the onPaymentFailed hook', async () => {
    const databaseId = uuid()
    const port = await getPort()

    const mockOnPaymentFailed = mock(() => {})

    const wabe = new Wabe({
      rootKey:
        'eIUbb9abFa8PJGRfRwgiGSCU0fGnLErph2QYjigDRjLsbyNA3fZJ8Npd0FJNzxAc',
      publicUrl: 'http://127.0.0.1',
      database: {
        type: DatabaseEnum.Mongo,
        url: 'mongodb://127.0.0.1:27045',
        name: databaseId,
      },
      port,
      payment: {
        // @ts-expect-error
        onPaymentFailed: async (options: any) => mockOnPaymentFailed(options),
      } as any,
    })

    await wabe.start()

    await fetch(`http://127.0.0.1:${port}/webhooks/payment`, {
      method: 'POST',
      body: JSON.stringify({
        type: 'payment_intent.payment_failed',
        created: 'created',
        data: {
          object: {
            amount: 100,
            currency: 'eur',
            customer: {
              email: 'customer@test.com',
            },
            payment_method_types: ['card'],
            last_payment_error: {
              message: 'Payment failed',
            },
            shipping: {
              address: {
                city: 'Paris',
                country: 'France',
                line1: '1 rue de la Paix',
                line2: '75008 Paris',
                postalCode: '75008',
                state: 'Paris',
              },
              name: 'John Doe',
              phone: '+33612345678',
            },
          },
        },
      }),
    })

    expect(mockOnPaymentFailed).toHaveBeenCalledTimes(1)
    expect(mockOnPaymentFailed).toHaveBeenCalledWith({
      created: 'created',
      amount: 1,
      messageError: 'Payment failed',
      paymentMethodTypes: ['card'],
    })

    await wabe.close()
  })

  it('should throw an error if hook has negative value', async () => {
    const databaseId = uuid()

    const port = await getPort()
    expect(
      () =>
        new Wabe({
          publicUrl: 'http://127.0.0.1',
          rootKey:
            'eIUbb9abFa8PJGRfRwgiGSCU0fGnLErph2QYjigDRjLsbyNA3fZJ8Npd0FJNzxAc',
          database: {
            type: DatabaseEnum.Mongo,
            url: 'mongodb://127.0.0.1:27045',
            name: databaseId,
          },
          port,
          hooks: [
            {
              operationType: OperationType.BeforeCreate,
              callback: () => {},
              priority: -1,
            },
          ],
        }),
    ).toThrow('Hook priority <= 0 is reserved for internal uses')

    expect(
      () =>
        new Wabe({
          publicUrl: 'http://127.0.0.1',
          rootKey:
            'eIUbb9abFa8PJGRfRwgiGSCU0fGnLErph2QYjigDRjLsbyNA3fZJ8Npd0FJNzxAc',
          database: {
            type: DatabaseEnum.Mongo,
            url: 'mongodb://127.0.0.1:27045',
            name: databaseId,
          },
          port,
          hooks: [],
        }),
    ).not.toThrow()

    expect(
      () =>
        new Wabe({
          publicUrl: 'http://127.0.0.1',
          rootKey:
            'eIUbb9abFa8PJGRfRwgiGSCU0fGnLErph2QYjigDRjLsbyNA3fZJ8Npd0FJNzxAc',
          database: {
            type: DatabaseEnum.Mongo,
            url: 'mongodb://127.0.0.1:27045',
            name: databaseId,
          },
          port,
          hooks: [
            {
              operationType: OperationType.BeforeCreate,
              callback: () => {},
              priority: 1,
            },
          ],
        }),
    ).not.toThrow()
  })

  it('should run server without schema object', async () => {
    const databaseId = uuid()

    const port = await getPort()
    const wabe = new Wabe({
      rootKey:
        'eIUbb9abFa8PJGRfRwgiGSCU0fGnLErph2QYjigDRjLsbyNA3fZJ8Npd0FJNzxAc',
      database: {
        type: DatabaseEnum.Mongo,
        url: 'mongodb://127.0.0.1:27045',
        name: databaseId,
      },
      port,
    })

    await wabe.start()

    const res = await fetch(`http://127.0.0.1:${port}/health`)

    expect(res.status).toEqual(200)
    await wabe.close()
  })

  it('should update the schema to static Wabe after the Schema initialization', async () => {
    const spySchemaDefaultClass = spyOn(Schema.prototype, 'defaultClass')
    const spySchemaDefaultEnum = spyOn(Schema.prototype, 'defaultEnum')

    const databaseId = uuid()

    const port = await getPort()

    const wabe = new Wabe({
      rootKey:
        'eIUbb9abFa8PJGRfRwgiGSCU0fGnLErph2QYjigDRjLsbyNA3fZJ8Npd0FJNzxAc',
      database: {
        type: DatabaseEnum.Mongo,
        url: 'mongodb://127.0.0.1:27045',
        name: databaseId,
      },
      port,
      schema: {
        classes: [
          {
            name: 'Collection1',
            fields: { name: { type: 'String' } },
          },
        ],
      },
    })

    await wabe.start()

    // _Session class is a default class so if it's present the schema is updated
    const isSessionClassExist = wabe.config.schema?.classes?.find(
      (schemaClass) => schemaClass.name === '_Session',
    )

    expect(isSessionClassExist).not.toBeUndefined()

    expect(spySchemaDefaultClass).toHaveBeenCalledTimes(1)
    expect(spySchemaDefaultEnum).toHaveBeenCalledTimes(1)

    await wabe.close()
  })
})
