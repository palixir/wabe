import {
  afterAll,
  beforeAll,
  describe,
  expect,
  it,
  mock,
  spyOn,
  beforeEach,
  type Mock,
} from 'bun:test'
import type { Wabe } from '../server'
import {
  type DevWabeTypes,
  setupTests,
  closeTests,
  getAnonymousClient,
  getUserClient,
} from '../utils/helper'
import type { WabeContext } from '../server/interface'
import { OperationType, getDefaultHooks } from '../hooks'
import { gql } from 'graphql-request'
import { Currency } from '../payment'

describe('Database', () => {
  let wabe: Wabe<DevWabeTypes>
  let context: WabeContext<any>

  const mockUpdateObject = mock(async () => {
    await context.wabe.controllers.database.updateObjects({
      className: 'User',
      where: {
        name: { equalTo: 'Lucas' },
      },
      data: { age: 21 },
      context,
      fields: [],
    })
  })

  const mockAfterUpdate = mock(async () => {
    await context.wabe.controllers.database.createObjects({
      className: 'Test2',
      data: [{ name: 'test' }],
      context,
      fields: [],
    })
  })

  let spyGetObjects: Mock<any>
  let spyGetObject: Mock<any>

  beforeAll(async () => {
    const setup = await setupTests([
      {
        name: 'Test2',
        fields: {
          name: { type: 'String' },
          age: { type: 'Int' },
        },
        permissions: {
          read: {
            authorizedRoles: ['Client2'],
            requireAuthentication: true,
          },
          create: {
            authorizedRoles: [],
            requireAuthentication: true,
          },
        },
      },
    ])
    wabe = setup.wabe

    context = {
      isRoot: true,
      wabe: {
        controllers: { database: wabe.controllers.database },
        config: wabe.config,
      },
    } as WabeContext<any>

    spyGetObjects = spyOn(wabe.controllers.database, 'getObjects')
    spyGetObject = spyOn(wabe.controllers.database, 'getObject')
  })

  afterAll(async () => {
    await closeTests(wabe)
  })

  beforeEach(async () => {
    await wabe.controllers.database.adapter.clearDatabase()

    wabe.config.hooks = getDefaultHooks()

    mockUpdateObject.mockClear()
    mockAfterUpdate.mockClear()
    spyGetObject.mockClear()
    spyGetObjects.mockClear()
  })

  it('should return null on createObject when no fields are provided', async () => {
    const res = await wabe.controllers.database.createObject({
      className: 'User',
      context,
      data: { name: 'Lucas' },
      fields: [],
    })

    expect(res).toBeNull()
  })

  it('should return empty array on createObjects when no fields are provided', async () => {
    const res = await wabe.controllers.database.createObjects({
      className: 'User',
      context,
      data: [{ name: 'Lucas' }],
      fields: [],
    })

    expect(res).toBeEmpty()
  })

  it('should return null on updateObject when no fields are provided', async () => {
    const createdObject = await wabe.controllers.database.createObject({
      className: 'User',
      context,
      data: { name: 'Lucas' },
      fields: ['id'],
    })

    const res = await wabe.controllers.database.updateObject({
      className: 'User',
      context,
      data: { name: 'Lucas' },
      fields: [],
      id: createdObject?.id || '',
    })

    expect(res).toBeNull()
  })

  it('should return empty array on updateObjects when no fields are provided', async () => {
    await wabe.controllers.database.createObject({
      className: 'User',
      context,
      data: { name: 'Lucas' },
      fields: ['id'],
    })

    const res = await wabe.controllers.database.updateObjects({
      className: 'User',
      context,
      data: { name: 'Lucas2' },
      fields: [],
      where: { name: { equalTo: 'Lucas' } },
    })

    expect(res).toBeEmpty()
  })

  it('should return null on deleteObject when no fields are provided', async () => {
    const createdObject = await wabe.controllers.database.createObject({
      className: 'User',
      context,
      data: { name: 'Lucas' },
      fields: ['id'],
    })

    const res = await wabe.controllers.database.deleteObject({
      className: 'User',
      context,
      fields: [],
      id: createdObject?.id || '',
    })

    expect(res).toBeNull()
  })

  it('should return empty array on deleteObjects when no fields are provided', async () => {
    await wabe.controllers.database.createObject({
      className: 'User',
      context,
      data: { name: 'Lucas' },
      fields: ['id'],
    })

    const res = await wabe.controllers.database.deleteObjects({
      className: 'User',
      context,
      fields: [],
      where: { name: { equalTo: 'Lucas' } },
    })

    expect(res).toBeEmpty()
  })

  it("should return all elements of a class when the object doesn't have ACL but the user is connected", async () => {
    const anonymousClient = getAnonymousClient(context.wabe.config.port)

    const { signUpWith } = await anonymousClient.request<any>(
      graphql.signUpWith,
      {
        input: {
          authentication: {
            emailPassword: {
              email: 'email@test.fr',
              password: 'password',
            },
          },
        },
      },
    )

    const userClient = getUserClient(
      context.wabe.config.port,
      signUpWith.accessToken,
    )

    await wabe.controllers.database.createObject({
      className: 'Payment',
      context,
      data: {
        amount: 10,
        currency: Currency.EUR,
      },
      fields: ['id'],
    })

    const {
      payments: { edges },
    } = await userClient.request<any>(graphql.payments)

    expect(edges.length).toEqual(1)

    const {
      payments: { edges: edges2 },
    } = await anonymousClient.request<any>(graphql.payments)

    expect(edges2.length).toEqual(1)
  })

  it('should order the element in the query by name ASC using order enum', async () => {
    await wabe.controllers.database.createObjects({
      className: 'User',
      context,
      data: [
        { name: 'test1' },
        { name: 'test2' },
        { name: 'test3' },
        { name: 'test4' },
      ],
      fields: [],
    })

    const res = await wabe.controllers.database.getObjects({
      className: 'User',
      context,
      fields: ['name'],
      order: { name: 'ASC' },
    })

    expect(res[0]?.name).toBe('test1')
    expect(res[1]?.name).toBe('test2')
  })

  it('should create object with subobject (hooks default call authentication before create user)', async () => {
    const res = await wabe.controllers.database.createObject({
      className: 'User',
      context,
      fields: ['authentication'],
      data: {
        provider: 'Google',
        isOauth: true,
        authentication: {
          google: {
            email: 'email@test.fr',
            verifiedEmail: true,
            idToken: 'idToken',
          },
        },
      },
    })

    expect(res?.authentication?.google).toEqual({
      email: 'email@test.fr',
      verifiedEmail: true,
      idToken: 'idToken',
    })
  })

  it('should not computeObject in runOnSingleObject if there is no hooks to execute on createObject', async () => {
    wabe.config.hooks = []

    await wabe.controllers.database.createObject({
      className: 'User',
      context,
      data: { name: 'Lucas' },
      fields: ['id'],
    })

    expect(spyGetObject).toHaveBeenCalledTimes(1)
  })

  it('should not computeObjects in runOnMultipleObjects if there is no hooks to execute on createObjects', async () => {
    wabe.config.hooks = []

    await wabe.controllers.database.createObjects({
      className: 'User',
      context,
      data: [{ name: 'Lucas' }],
      fields: ['id'],
    })

    expect(spyGetObjects).toHaveBeenCalledTimes(1)
  })

  it('should not computeObject in runOnSingleObject if there is no hooks to execute on updateObject', async () => {
    wabe.config.hooks = []

    const res = await wabe.controllers.database.createObject({
      className: 'User',
      context,
      data: { name: 'Lucas' },
      fields: ['id'],
    })

    spyGetObject.mockClear()

    await wabe.controllers.database.updateObject({
      className: 'User',
      context,
      // @ts-expect-error
      data: [{ name: 'Lucas' }],
      fields: ['id'],
      id: res?.id || '',
    })

    expect(spyGetObject).toHaveBeenCalledTimes(1)
  })

  it('should not computeObject in runOnMultipleObject if there is no hooks to execute on updateObjects', async () => {
    wabe.config.hooks = []

    const res = await wabe.controllers.database.createObject({
      className: 'User',
      context,
      data: { name: 'Lucas' },
      fields: ['id'],
    })

    spyGetObjects.mockClear()

    await wabe.controllers.database.updateObjects({
      className: 'User',
      context,
      data: { name: 'Lucas' },
      fields: ['id'],
      where: { id: { equalTo: res?.id || '' } },
    })

    // Mongo adapter call 2 times getObjects in updateObjects
    expect(spyGetObjects).toHaveBeenCalledTimes(2)
  })

  it('should not computeObject in runOnSingleObject if there is no hooks to execute on updateObject', async () => {
    wabe.config.hooks = []

    const res = await wabe.controllers.database.createObject({
      className: 'User',
      context,
      data: { name: 'Lucas' },
      fields: ['id'],
    })

    spyGetObject.mockClear()

    await wabe.controllers.database.deleteObject({
      className: 'User',
      context,
      fields: ['id'],
      id: res?.id || '',
    })

    expect(spyGetObject).toHaveBeenCalledTimes(1)
  })

  it('should not computeObject in runOnMultipleObject if there is no hooks to execute on updateObjects', async () => {
    wabe.config.hooks = []

    const res = await wabe.controllers.database.createObject({
      className: 'User',
      context,
      data: { name: 'Lucas' },
      fields: ['id'],
    })

    spyGetObjects.mockClear()

    await wabe.controllers.database.deleteObjects({
      className: 'User',
      context,
      fields: ['id'],
      where: { id: { equalTo: res?.id || '' } },
    })

    expect(spyGetObjects).toHaveBeenCalledTimes(1)
  })

  it('should get the good value in output of createObject after mutation on after hook', async () => {
    wabe.config.hooks = [
      {
        className: 'User',
        operationType: OperationType.AfterCreate,
        callback: mockUpdateObject,
        priority: 1,
      },
      {
        className: 'Test2',
        operationType: OperationType.AfterUpdate,
        callback: mockAfterUpdate,
        priority: 1,
      },
    ]
    const res = await context.wabe.controllers.database.createObject({
      className: 'User',
      data: { name: 'Lucas', age: 20 },
      context,
      fields: ['age'],
    })

    expect(res?.age).toEqual(21)

    expect(mockUpdateObject).toHaveBeenCalledTimes(1)
  })

  it('should get the good value in output of createObjects after mutation on after hook', async () => {
    wabe.config.hooks = [
      {
        className: 'User',
        operationType: OperationType.AfterCreate,
        callback: mockUpdateObject,
        priority: 1,
      },
      {
        className: 'Test2',
        operationType: OperationType.AfterUpdate,
        callback: mockAfterUpdate,
        priority: 1,
      },
    ]
    const res = await context.wabe.controllers.database.createObjects({
      className: 'User',
      data: [{ name: 'Lucas', age: 20 }],
      context,
      fields: ['age'],
    })

    expect(res[0]?.age).toEqual(21)

    expect(mockUpdateObject).toHaveBeenCalledTimes(1)
  })

  it('should get the good value in output of updateObjects after mutation on after hook', async () => {
    wabe.config.hooks = [
      {
        className: 'User',
        operationType: OperationType.AfterCreate,
        callback: mockUpdateObject,
        priority: 1,
      },
      {
        className: 'Test2',
        operationType: OperationType.AfterUpdate,
        callback: mockAfterUpdate,
        priority: 1,
      },
    ]
    await context.wabe.controllers.database.createObjects({
      className: 'Test2',
      data: [{ name: 'test', age: 20 }],
      context,
      fields: [],
    })

    const res = await context.wabe.controllers.database.updateObjects({
      className: 'Test2',
      context,
      fields: ['name'],
      where: { name: { equalTo: 'test' } },
      data: { name: 20 },
    })

    expect(res.length).toEqual(1)

    expect(mockAfterUpdate).toHaveBeenCalledTimes(1)
  })

  it('should get the good value in output of updateObject after mutation on after hook', async () => {
    wabe.config.hooks = [
      {
        className: 'User',
        operationType: OperationType.AfterCreate,
        callback: mockUpdateObject,
        priority: 1,
      },
      {
        className: 'Test2',
        operationType: OperationType.AfterUpdate,
        callback: mockAfterUpdate,
        priority: 1,
      },
    ]
    const res = await context.wabe.controllers.database.createObjects({
      className: 'Test2',
      data: [{ name: 'test', age: 20 }],
      context,
      fields: ['id'],
    })

    const res2 = await context.wabe.controllers.database.updateObject({
      className: 'Test2',
      context,
      fields: ['name'],
      data: { age: 20 },
      id: res[0]?.id,
    })

    expect(res2?.name).toEqual('test')

    expect(mockAfterUpdate).toHaveBeenCalledTimes(1)
  })
})

const graphql = {
  signUpWith: gql`
      mutation signUpWith($input: SignUpWithInput!) {
        signUpWith(input:	$input){
          id
          accessToken
          refreshToken
        }
      }
    `,
  payments: gql`
    query payments {
      payments {
        edges {
            node {
            id
            amount
            acl{
                users{
                    userId
                }

            }
            }
        }
      }
    }
    `,
}
