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
  getAdminUserClient,
} from '../utils/helper'
import type { WabeContext } from '../server/interface'
import { OperationType, getDefaultHooks } from '../hooks'
import { gql } from 'graphql-request'

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

  it('should have access to original object in afterDelete hook with deleteObject', async () => {
    const mockInsideCallback = mock(() => {})
    wabe.config.hooks = [
      {
        className: 'User',
        operationType: OperationType.AfterDelete,
        priority: 1,
        callback: (hookObject) => {
          mockInsideCallback()

          expect(hookObject.originalObject).toEqual(
            expect.objectContaining({
              name: 'John',
              age: 20,
            }),
          )
        },
      },
    ]

    const object = await wabe.controllers.database.createObject({
      className: 'User',
      data: {
        name: 'John',
        age: 20,
      },
      fields: ['id'],
      context,
    })

    await wabe.controllers.database.deleteObject({
      className: 'User',
      context,
      fields: ['id'],
      id: object?.id || '',
    })

    expect(mockInsideCallback).toHaveBeenCalledTimes(1)
  })

  it('should have access to original object in afterDelete hook with deleteObjects', async () => {
    const mockInsideCallback = mock(() => {})
    wabe.config.hooks = [
      {
        className: 'User',
        operationType: OperationType.AfterDelete,
        priority: 1,
        callback: (hookObject) => {
          mockInsideCallback()

          expect(hookObject.originalObject).toEqual(
            expect.objectContaining({
              name: 'John',
              age: 20,
            }),
          )
        },
      },
    ]

    const object = await wabe.controllers.database.createObject({
      className: 'User',
      data: {
        name: 'John',
        age: 20,
      },
      fields: ['id'],
      context,
    })

    await wabe.controllers.database.deleteObjects({
      className: 'User',
      context,
      fields: ['id'],
      where: { id: { equalTo: object?.id || '' } },
    })

    expect(mockInsideCallback).toHaveBeenCalledTimes(1)
  })

  it('should have access to original object in afterUpdate hook with updateObject', async () => {
    const mockInsideCallback = mock(() => {})
    wabe.config.hooks = [
      {
        className: 'User',
        operationType: OperationType.AfterUpdate,
        priority: 1,
        callback: (hookObject) => {
          mockInsideCallback()

          expect(hookObject.originalObject).toEqual(
            expect.objectContaining({
              name: 'John',
              age: 20,
            }),
          )
        },
      },
    ]

    const object = await wabe.controllers.database.createObject({
      className: 'User',
      data: {
        name: 'John',
        age: 20,
      },
      fields: ['id'],
      context,
    })

    await wabe.controllers.database.updateObject({
      className: 'User',
      context,
      fields: ['id'],
      data: { name: 'John2' },
      id: object?.id || '',
    })

    expect(mockInsideCallback).toHaveBeenCalledTimes(1)
  })

  it('should have access to original object in afterUpdate hook with updateObjects', async () => {
    const mockInsideCallback = mock(() => {})
    wabe.config.hooks = [
      {
        className: 'User',
        operationType: OperationType.AfterUpdate,
        priority: 1,
        callback: (hookObject) => {
          mockInsideCallback()

          expect(hookObject.originalObject).toEqual(
            expect.objectContaining({
              name: 'John',
              age: 20,
            }),
          )
        },
      },
    ]

    const object = await wabe.controllers.database.createObject({
      className: 'User',
      data: {
        name: 'John',
        age: 20,
      },
      fields: ['id'],
      context,
    })

    await wabe.controllers.database.updateObjects({
      className: 'User',
      context,
      fields: ['id'],
      data: { name: 'John2' },
      where: { id: { equalTo: object?.id || '' } },
    })

    expect(mockInsideCallback).toHaveBeenCalledTimes(1)
  })

  it('should get all the objects with limit', async () => {
    const res = await wabe.controllers.database.createObjects({
      className: 'User',
      data: [
        {
          name: 'John',
          age: 20,
        },
        {
          name: 'John1',
          age: 20,
        },
        {
          name: 'John2',
          age: 20,
        },
        {
          name: 'John3',
          age: 20,
        },
        {
          name: 'John4',
          age: 20,
        },
      ],
      fields: ['name', 'id'],
      first: 2,
      context,
    })

    expect(res.length).toEqual(2)
  })

  // For the moment we keep the mongodb behavior for the negative value (for limit)
  // https://www.mongodb.com/docs/manual/reference/method/cursor.limit/#negative-values
  it('should get all the objects with negative limit and offset', async () => {
    const res = await wabe.controllers.database.createObjects({
      className: 'User',
      data: [
        {
          name: 'John',
          age: 20,
        },
        {
          name: 'John1',
          age: 20,
        },
        {
          name: 'John2',
          age: 20,
        },
        {
          name: 'John3',
          age: 20,
        },
        {
          name: 'John4',
          age: 20,
        },
      ],
      fields: ['name', 'id'],
      first: -2,
      context,
    })

    expect(res.length).toEqual(2)

    expect(
      wabe.controllers.database.createObjects({
        className: 'User',
        data: [
          {
            name: 'John',
            age: 20,
          },
          {
            name: 'John1',
            age: 20,
          },
          {
            name: 'John2',
            age: 20,
          },
          {
            name: 'John3',
            age: 20,
          },
          {
            name: 'John4',
            age: 20,
          },
        ],
        fields: ['name', 'id'],
        offset: -2,
        context,
      }),
    ).rejects.toThrow("BSON field 'skip' value must be >= 0, actual value '-2'")
  })

  it('should createObjects and deleteObjects with offset and limit', async () => {
    const res = await wabe.controllers.database.createObjects({
      className: 'User',
      data: [
        {
          name: 'John',
          age: 20,
        },
        {
          name: 'John1',
          age: 20,
        },
        {
          name: 'John2',
          age: 20,
        },
        {
          name: 'John3',
          age: 20,
        },
        {
          name: 'John4',
          age: 20,
        },
      ],
      fields: ['name', 'id'],
      first: 2,
      offset: 2,
      context,
    })

    expect(res.length).toEqual(2)
    expect(res[0]?.name).toEqual('John2')
    expect(res[1]?.name).toEqual('John3')

    await wabe.controllers.database.deleteObjects({
      className: 'User',
      where: {
        OR: [
          { name: { equalTo: 'John2' } },
          { name: { equalTo: 'John3' } },
          { name: { equalTo: 'John4' } },
        ],
      },
      fields: ['name'],
      first: 2,
      offset: 1,
      context,
    })

    const res2 = await wabe.controllers.database.getObjects({
      className: 'User',
      where: {
        OR: [
          { name: { equalTo: 'John2' } },
          { name: { equalTo: 'John3' } },
          { name: { equalTo: 'John4' } },
        ],
      },
      context,
      fields: ['*'],
    })

    expect(res2.length).toEqual(0)
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
    const adminClient = await getAdminUserClient(
      context.wabe.config.port,
      context.wabe,
      {
        email: 'email@test.fr',
        password: 'password',
      },
    )

    await wabe.controllers.database.createObject({
      className: 'User',
      context: { ...context, isRoot: true },
      data: {
        name: 'Doe',
      },
      fields: [],
    })

    const {
      users: { edges },
    } = await adminClient.request<any>(graphql.users)

    expect(edges.length).toEqual(1)
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
  users: gql`
    query users {
      users {
        edges {
            node {
               id
            }
        }
      }
    }
    `,
}
