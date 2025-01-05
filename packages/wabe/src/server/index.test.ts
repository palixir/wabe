import { describe, expect, it, spyOn } from 'bun:test'
import { v4 as uuid } from 'uuid'
import getPort from 'get-port'
import { Wabe } from '.'
import { DatabaseEnum } from '../database'
import { Schema } from '../schema'
import { OperationType } from '../hooks'

describe('Server', () => {
  it('should load routes', async () => {
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
      routes: [
        {
          handler: (ctx) => ctx.res.send('Hello World!'),
          path: '/hello',
          method: 'GET',
        },
      ],
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

    const res = await fetch(`http://127.0.0.1:${port}/hello`)

    expect(await res.text()).toBe('Hello World!')
    await wabe.close()
  })

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

  it('should run server on different hostname', async () => {
    const databaseId = uuid()

    const port = await getPort()
    const wabe = new Wabe({
      hostname: '0.0.0.0',
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

    const res = await fetch(`http://0.0.0.0:${port}/health`)

    expect(res.status).toEqual(200)
    await wabe.close()
  })

  it('should throw an error if hook has negative value', async () => {
    const databaseId = uuid()

    const port = await getPort()
    expect(
      () =>
        new Wabe({
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

  it('should load RoleEnum correctly', async () => {
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
      authentication: {
        roles: ['Admin', 'Client'],
      },
    })

    await wabe.start()

    const roleEnum = wabe.config.schema?.enums?.find(
      (schemaEnum) => schemaEnum.name === 'RoleEnum',
    )

    expect(roleEnum).not.toBeUndefined()
    expect(roleEnum?.values).toEqual({
      Admin: 'Admin',
      Client: 'Client',
    })

    await wabe.close()
  })
})
