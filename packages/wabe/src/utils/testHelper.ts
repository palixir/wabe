import { v4 as uuid } from 'uuid'
import { type ClassInterface, EmailDevAdapter, FileDevAdapter } from '..'
import { Wabe } from '../server'
import type { DevWabeTypes } from './helper'
import getPort from 'get-port'

export const getDatabaseAdapter = async (databaseName: string) => {
  const mongodbAdapter = await import('wabe-mongodb')

  return new mongodbAdapter.MongoAdapter<DevWabeTypes>({
    // For postgres
    // databaseUrl: 'postgresql://wabe:wabe@localhost:5432',
    databaseUrl: 'mongodb://localhost:27045',
    databaseName,
  })
}

export const setupTests = async (
  additionalClasses: ClassInterface<any>[] = [],
) => {
  const databaseId = uuid()

  const port = await getPort()

  const wabe = new Wabe<DevWabeTypes>({
    isProduction: false,
    rootKey:
      '0uwFvUxM$ceFuF1aEtTtZMa7DUN2NZudqgY5ve5W*QCyb58cwMj9JeoaV@d#%29v&aJzswuudVU1%nAT+rxS0Bh&OkgBYc0PH18*',
    database: {
      // @ts-expect-error
      adapter: await getDatabaseAdapter(databaseId),
    },
    authentication: {
      roles: ['Client', 'Client2', 'Client3', 'Admin'],
      session: {
        jwtSecret: 'dev',
        cookieSession: true,
      },
    },
    port,
    email: {
      adapter: new EmailDevAdapter(),
      mainEmail: 'main.email@wabe.com',
    },
    file: {
      adapter: new FileDevAdapter(),
      // 12 hours of cache
      urlCacheInSeconds: 3600 * 12,
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
            test: { type: 'TestScalar' },
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
          name: 'TestScalar',
          description: 'Test scalar',
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
