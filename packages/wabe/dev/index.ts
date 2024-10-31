import { runDatabase } from 'wabe-mongodb-launcher'
import { StripeAdapter } from 'wabe-stripe'
import { Currency, DatabaseEnum, Wabe } from '../src'
import type {
  WabeSchemaEnums,
  WabeSchemaScalars,
  WabeSchemaTypes,
} from '../generated/wabe'

const run = async () => {
  await runDatabase()

  const wabe = new Wabe<{
    types: WabeSchemaTypes
    scalars: WabeSchemaScalars
    enums: WabeSchemaEnums
  }>({
    codegen: {
      enabled: true,
      path: `${import.meta.dirname}/../generated/`,
    },
    rootKey: 'dev',
    authentication: {
      session: {
        cookieSession: true,
      },
      roles: ['Admin', 'Client'],
      successRedirectPath: 'http://localhost:3000/auth/oauth?provider=google',
      failureRedirectPath: 'http://localhost:3000/auth/oauth?provider=google',
      customAuthenticationMethods: [
        {
          name: 'otp',
          input: {
            code: {
              type: 'String',
            },
          },
          provider: {} as any,
          isSecondaryFactor: true,
        },
      ],
    },
    database: {
      type: DatabaseEnum.Mongo,
      url: 'mongodb://127.0.0.1:27045',
      name: 'Wabe',
    },
    port: 3000,
    payment: {
      adapter: new StripeAdapter(''),
      currency: Currency.EUR,
      supportedPaymentMethods: ['card'],
      webhook: {
        secret:
          'whsec_56d339bf51e617aa4a3de35564a6bd5740517dbcfcd827226425bda49c033e5a',
        url: '/webhooks/payment',
      },
    },
    schema: {
      classes: [
        {
          name: 'User',
          description: 'User class',
          fields: {
            name: {
              type: 'String',
            },
            age: {
              type: 'Int',
            },
          },
        },
        {
          name: 'Post',
          fields: {
            name: { type: 'String', required: true },
            test: { type: 'File' },
          },
          permissions: {
            create: {
              requireAuthentication: true,
              authorizedRoles: ['Admin'],
            },
          },
        },
      ],
      scalars: [
        {
          name: 'Phone',
          description: 'Phone custom scalar type',
        },
      ],
      resolvers: {
        queries: {
          helloWorld: {
            type: 'String',
            description: 'Hello world description',
            args: {
              name: {
                type: 'String',
                required: true,
              },
            },
            resolve: () => 'Hello World',
          },
        },
        mutations: {
          createMutation: {
            type: 'Boolean',
            required: true,
            args: {
              input: {
                name: {
                  type: 'Int',
                  required: true,
                },
              },
            },
            resolve: () => true,
          },
          customMutation: {
            type: 'Int',
            args: {
              input: {
                a: {
                  type: 'Int',
                  required: true,
                },
                b: {
                  type: 'Int',
                  required: true,
                },
              },
            },
            resolve: (_: any, args: any) => args.input.a + args.input.b,
          },
          secondCustomMutation: {
            type: 'Int',
            args: {
              input: {
                sum: {
                  type: 'Object',
                  object: {
                    name: 'Sum',
                    fields: {
                      a: {
                        type: 'Int',
                        required: true,
                      },
                      b: {
                        type: 'Int',
                        required: true,
                      },
                    },
                  },
                },
              },
            },
            resolve: (_: any, args: any) => args.input.sum.a + args.input.sum.b,
          },
        },
      },
    },
  })

  await wabe.start()
}

run().catch((err) => {
  console.error(err)
})
