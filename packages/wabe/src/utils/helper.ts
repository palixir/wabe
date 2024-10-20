import getPort from 'get-port'
import { GraphQLClient } from 'graphql-request'
import { v4 as uuid } from 'uuid'
import type {
  WabeSchemaEnums,
  WabeSchemaScalars,
  WabeSchemaTypes,
} from '../../generated/wabe'
import { DatabaseEnum } from '../database'
import { Wabe } from '../server'
import { PaymentDevAdapter } from '../payment/DevAdapter'
import type { ClassInterface } from '../schema'
import { EmailDevAdapter } from '../email/DevAdapter'

type NotNill<T> = T extends null | undefined ? never : T

type Primitive = undefined | null | boolean | string | number

export type DeepRequired<T> = T extends Primitive
  ? NotNill<T>
  : {
      [P in keyof T]-?: T[P] extends Array<infer U>
        ? Array<DeepRequired<U>>
        : T[P] extends ReadonlyArray<infer U2>
          ? DeepRequired<U2>
          : DeepRequired<T[P]>
    }

export type DevWabeTypes = {
  types: WabeSchemaTypes
  scalars: WabeSchemaScalars
  enums: WabeSchemaEnums
}

export const notEmpty = <T>(value: T | null | undefined): value is T =>
  value !== null && value !== undefined

export const getGraphqlClient = (port: number): GraphQLClient => {
  const client = new GraphQLClient(`http://127.0.0.1:${port}/graphql`, {
    headers: {
      'Wabe-Root-Key':
        '0uwFvUxM$ceFuF1aEtTtZMa7DUN2NZudqgY5ve5W*QCyb58cwMj9JeoaV@d#%29v&aJzswuudVU1%nAT+rxS0Bh&OkgBYc0PH18*',
    },
  })

  return { ...client, request: client.request<any> } as GraphQLClient
}

export const getAnonymousClient = (port: number): GraphQLClient => {
  const client = new GraphQLClient(`http://127.0.0.1:${port}/graphql`)

  return { ...client, request: client.request<any> } as GraphQLClient
}

export const getUserClient = (
  port: number,
  accessToken: string,
): GraphQLClient => {
  const client = new GraphQLClient(`http://127.0.0.1:${port}/graphql`, {
    headers: {
      'Wabe-Access-Token': accessToken,
    },
  })

  return { ...client, request: client.request<any> } as GraphQLClient
}

export const setupTests = async (
  additionalClasses: ClassInterface<any>[] = [],
) => {
  const databaseId = uuid()

  const port = await getPort()

  const wabe = new Wabe<DevWabeTypes>({
    rootKey:
      '0uwFvUxM$ceFuF1aEtTtZMa7DUN2NZudqgY5ve5W*QCyb58cwMj9JeoaV@d#%29v&aJzswuudVU1%nAT+rxS0Bh&OkgBYc0PH18*',
    database: {
      type: DatabaseEnum.Mongo,
      url: 'mongodb://127.0.0.1:27045',
      name: databaseId,
    },
    authentication: {
      roles: ['Client', 'Client2', 'Client3'],
      session: {
        cookieSession: true,
      },
    },
    port,
    publicUrl: 'http://127.0.0.1',
    email: {
      adapter: new EmailDevAdapter(),
      mainEmail: 'main.email@wabe.com',
    },
    payment: {
      // @ts-expect-error
      adapter: new PaymentDevAdapter(),
      asyhnonPaymentSucceed: async () => {},
      onPaymentFailed: async () => {},
    },
    schema: {
      classes: [
        ...additionalClasses,
        {
          name: 'User',
          fields: {
            name: { type: 'String' },
            age: { type: 'Int' },
            isAdmin: { type: 'Boolean', defaultValue: false },
            floatValue: { type: 'Float' },
            birthDate: { type: 'Date' },
            arrayValue: {
              type: 'Array',
              typeValue: 'String',
            },
            phone: {
              type: 'Phone',
            },
          },
          searchableFields: ['email'],
          permissions: {
            update: {
              requireAuthentication: false,
            },
            read: {
              requireAuthentication: false,
            },
            acl: {
              authorizedUsers: {
                read: ['self'],
                write: ['self'],
              },
              authorizedRoles: {
                read: [],
                write: [],
              },
            },
          },
        },
      ],
      scalars: [
        {
          name: 'Phone',
          description: 'Phone scalar',
        },
      ],
    },
  })

  await wabe.start()

  return { wabe, port }
}

export const closeTests = async (wabe: Wabe<DevWabeTypes>) => {
  await wabe.controllers.database.adapter?.close()
  await wabe.close()
}
