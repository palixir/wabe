import { v4 as uuid } from 'uuid'
import { runDatabase } from 'wabe-postgres-launcher'
import { type ClassInterface, Wabe } from 'wabe'
import getPort from 'get-port'
import { PostgresAdapter } from '../src'

export const setupTests = async (
  additionalClasses: ClassInterface<any>[] = [],
) => {
  const databaseId = uuid()

  const port = await getPort()

  const databasePostgres = await runDatabase()

  if (!databasePostgres) throw new Error('Failed to run Postgres database')

  const wabe = new Wabe<any>({
    isProduction: false,
    rootKey:
      '0uwFvUxM$ceFuF1aEtTtZMa7DUN2NZudqgY5ve5W*QCyb58cwMj9JeoaV@d#%29v&aJzswuudVU1%nAT+rxS0Bh&OkgBYc0PH18*',
    database: {
      adapter: new PostgresAdapter(
        {
          databaseUrl: 'postgresql://username:password@localhost:5432/dbname',
          databaseName: databaseId,
        },
        databasePostgres.pool,
      ),
    },
    authentication: {
      roles: ['Client', 'Client2', 'Client3', 'Admin'],
      session: {
        jwtSecret: 'dev',
        cookieSession: true,
      },
    },
    port,
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

export const closeTests = async (wabe: Wabe<any>) => {
  await wabe.controllers.database.adapter?.close()
  await wabe.close()
}
