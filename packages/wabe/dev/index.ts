import { runDatabase } from 'wabe-mongodb-launcher'
import { MongoAdapter } from 'wabe-mongodb'
import { Wabe } from '../src'
import {
  RoleEnum,
  type WabeSchemaWhereTypes,
  type WabeSchemaEnums,
  type WabeSchemaScalars,
  type WabeSchemaTypes,
} from '../generated/wabe'

const run = async () => {
  await runDatabase()

  const wabe = new Wabe<{
    types: WabeSchemaTypes
    scalars: WabeSchemaScalars
    enums: WabeSchemaEnums
    where: WabeSchemaWhereTypes
  }>({
    isProduction: false,
    codegen: {
      enabled: true,
      path: `${import.meta.dirname}/../generated/`,
    },
    rootKey: 'dev',
    authentication: {
      session: {
        cookieSession: true,
        jwtSecret: 'dev',
      },
      roles: ['Admin', 'Client'],
      successRedirectPath: 'http://shipmysaas.com',
      failureRedirectPath: 'https://shipmysaas.com',
    },
    database: {
      adapter: new MongoAdapter<{
        types: WabeSchemaTypes
        scalars: WabeSchemaScalars
        enums: WabeSchemaEnums
        where: WabeSchemaWhereTypes
      }>({
        databaseName: 'Wabe',
        databaseUrl: 'mongodb://127.0.0.1:27045',
      }),
    },
    port: 3000,
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
            email: {
              type: 'Email',
              required: true,
            },
          },
        },
        {
          name: 'Post',
          fields: {
            name: { type: 'String', required: true },
            test2: { type: 'RoleEnum' },
            test3: { type: 'Relation', class: 'User', required: true },
            test4: { type: 'Pointer', class: 'User', required: true },
            experiences: {
              type: 'Array',
              typeValue: 'Object',
              object: {
                name: 'Experience',
                required: true,
                fields: {
                  jobTitle: {
                    type: 'String',
                    required: true,
                  },
                  companyName: {
                    type: 'String',
                    required: true,
                  },
                  startDate: {
                    type: 'String',
                    required: true,
                  },
                  endDate: {
                    type: 'String',
                    required: true,
                  },
                  achievements: {
                    type: 'Array',
                    typeValue: 'String',
                  },
                },
              },
            },
          },
          permissions: {
            create: {
              requireAuthentication: true,
              authorizedRoles: [RoleEnum.Admin],
            },
          },
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

  // For select test
  // const res = await wabe.controllers.database.getObjects({
  //   className: 'Post',
  //   context: {} as any,
  //   select: {
  //     name: true,
  //     test3: {
  //       age: true,
  //       role: {
  //         id: true,
  //       },
  //     },
  //     test4: {
  //       name: true,
  //     },
  //   },
  //   where: {
  //     name: {
  //       equalTo: 'test',
  //     },
  //   },
  // })

  // res[0]?.test3[0].role?.id

  await wabe.start()
}

run().catch((err) => {
  console.error(err)
})
