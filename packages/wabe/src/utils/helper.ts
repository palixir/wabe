import getPort from 'get-port'
import { gql, GraphQLClient } from 'graphql-request'
import { v4 as uuid } from 'uuid'
import {
  RoleEnum,
  type WabeSchemaEnums,
  type WabeSchemaScalars,
  type WabeSchemaTypes,
} from '../../generated/wabe'
import { DatabaseEnum } from '../database'
import { Wabe, type WabeTypes } from '../server'
import { PaymentDevAdapter } from '../payment/DevAdapter'
import type { ClassInterface } from '../schema'
import { EmailDevAdapter } from '../email/DevAdapter'
import { Currency } from '../payment'

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

export interface DevWabeTypes extends WabeTypes {
  types: WabeSchemaTypes
  scalars: WabeSchemaScalars
  enums: WabeSchemaEnums
}

export const firstLetterUpperCase = (str: string): string =>
  str.charAt(0).toUpperCase() + str.slice(1)

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

export const getAdminUserClient = async (
  port: number,
  wabe: Wabe<DevWabeTypes>,
  { email, password }: { email: string; password: string },
): Promise<GraphQLClient> => {
  const roles = await wabe.controllers.database.getObjects({
    className: 'Role',
    context: {
      isRoot: true,
      wabe,
    } as any,
    fields: ['id'],
    where: {
      name: { equalTo: RoleEnum.Admin },
    },
  })

  const adminRoleId = roles[0]?.id

  const res = await getGraphqlClient(port).request<any>(
    gql`
      mutation signUpWith($input: SignUpWithInput!) {
        signUpWith(input: $input) {
          id
          accessToken
        }
      }
    `,
    {
      input: {
        authentication: {
          emailPassword: {
            email,
            password,
          },
        },
      },
    },
  )

  const accessToken = res.signUpWith.accessToken
  const userId = res.signUpWith.id

  await wabe.controllers.database.updateObjects({
    className: 'User',
    context: {
      isRoot: true,
      wabe,
    } as any,
    data: {
      role: adminRoleId,
    },
    fields: [],
    where: {
      id: { equalTo: userId },
    },
  })

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
      roles: ['Client', 'Client2', 'Client3', 'Admin'],
      session: {
        cookieSession: true,
      },
    },
    port,
    email: {
      adapter: new EmailDevAdapter(),
      mainEmail: 'main.email@wabe.com',
    },
    payment: {
      adapter: new PaymentDevAdapter(),
      currency: Currency.EUR,
      supportedPaymentMethods: ['card', 'paypal'],
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
            create: {
              requireAuthentication: false,
            },
            delete: {
              requireAuthentication: true,
            },
            update: {
              requireAuthentication: false,
            },
            read: {
              requireAuthentication: false,
            },
            acl: async (hookObject) => {
              await hookObject.addACL('users', {
                userId: hookObject.object?.id,
                read: true,
                write: true,
              })

              await hookObject.addACL('roles', null)
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
