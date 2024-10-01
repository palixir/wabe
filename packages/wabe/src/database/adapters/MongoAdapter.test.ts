import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  spyOn,
} from 'bun:test'
import { fail } from 'node:assert'
import { ObjectId } from 'mongodb'
import type { Wabe } from '../..'
import { type DevWabeTypes, closeTests, setupTests } from '../../utils/helper'
import { type MongoAdapter, buildMongoWhereQuery } from './MongoAdapter'
import type { WabeContext } from '../../server/interface'

describe('Mongo adapter', () => {
  let mongoAdapter: MongoAdapter<DevWabeTypes>
  let wabe: Wabe<DevWabeTypes>
  let context: WabeContext<any>

  beforeAll(async () => {
    const setup = await setupTests()
    wabe = setup.wabe

    // @ts-expect-error
    mongoAdapter = wabe.controllers.database.adapter

    context = {
      isRoot: true,
      wabe: {
        controllers: { database: wabe.controllers.database },
        config: wabe.config,
      },
    } as WabeContext<any>
  })

  afterAll(async () => {
    await closeTests(wabe)
  })

  beforeEach(async () => {
    const collections = await mongoAdapter.database?.collections()

    if (collections)
      await Promise.all(collections?.map((collection) => collection.drop()))
  })

  it("should order the result by the field 'name' in ascending order", async () => {
    await mongoAdapter.createObjects({
      className: 'User',
      data: [
        {
          name: 'A',
          age: 20,
        },
        {
          name: 'B',
          age: 18,
        },
      ],
      fields: [],
      context,
    })

    const res = await mongoAdapter.getObjects({
      className: 'User',
      fields: ['name'],
      order: {
        name: 'ASC',
      },
      context,
    })

    expect(res.map((user) => user.name)).toEqual(['A', 'B'])
  })

  it("should order the result by the field 'name' in descending order", async () => {
    await mongoAdapter.createObjects({
      className: 'User',
      data: [
        {
          name: 'A',
          age: 20,
        },
        {
          name: 'B',
          age: 18,
        },
      ],
      fields: [],
      context,
    })

    const res = await mongoAdapter.getObjects({
      className: 'User',
      fields: ['name'],
      order: {
        name: 'DESC',
      },
      context,
    })

    expect(res.map((user) => user.name)).toEqual(['B', 'A'])
  })

  it("should order the result by the field 'age' and 'name' in descending order", async () => {
    await mongoAdapter.createObjects({
      className: 'User',
      data: [
        {
          name: 'A',
          age: 20,
        },
        {
          name: 'B',
          age: 18,
        },
      ],
      fields: [],
      context,
    })

    const res = await mongoAdapter.getObjects({
      className: 'User',
      fields: ['name'],
      order: {
        age: 'ASC',
        name: 'DESC',
      },
      context,
    })

    expect(res.map((user) => user.name)).toEqual(['B', 'A'])
  })

  it('should count all elements corresponds to where condition in collection', async () => {
    const res = await mongoAdapter.count({
      className: 'User',
      context,
    })

    expect(res).toEqual(0)

    await mongoAdapter.createObjects({
      className: 'User',
      data: [
        {
          name: 'Lucas',
          age: 20,
        },
        {
          name: 'LucasBis',
          age: 18,
        },
      ],
      fields: [],
      context,
    })

    const res2 = await mongoAdapter.count({
      className: 'User',
      context,
    })

    expect(res2).toEqual(2)

    const res3 = await mongoAdapter.count({
      className: 'User',
      context,
      where: { age: { equalTo: 20 } },
    })

    expect(res3).toEqual(1)
  })

  it('should clear all database', async () => {
    await mongoAdapter.createObjects({
      className: 'User',
      data: [
        {
          name: 'Lucas',
          age: 20,
        },
        {
          name: 'LucasBis',
          age: 18,
        },
      ],
      fields: [],
      context,
    })

    await mongoAdapter.createObjects({
      className: '_Session',
      data: [
        {
          name: 'Lucas',
          age: 20,
        },
        {
          name: 'LucasBis',
          age: 18,
        },
      ],
      fields: [],
      context,
    })

    await mongoAdapter.clearDatabase()

    const res = await mongoAdapter.getObjects({
      className: 'User',
      fields: [],
      context,
    })

    const res2 = await mongoAdapter.getObjects({
      className: '_Session',
      fields: [],
      context,
    })

    expect(res.length).toEqual(0)
    expect(res2.length).toEqual(0)
  })

  it('should support where on getObject for additional check (acl for example)', async () => {
    const insertedObjects = await mongoAdapter.createObjects({
      className: 'User',
      data: [
        {
          name: 'Lucas',
          age: 20,
        },
        {
          name: 'LucasBis',
          age: 18,
        },
      ],
      fields: [],
      context,
    })

    expect(
      mongoAdapter.getObject({
        className: 'User',
        where: {
          name: { equalTo: 'InvalidName' },
        },
        id: insertedObjects[0].id,
        context,
        fields: ['*'],
      }),
    ).rejects.toThrow('Object not found')

    const res = await mongoAdapter.getObject({
      className: 'User',
      where: {
        name: { equalTo: 'Lucas' },
      },
      id: insertedObjects[0].id,
      context,
      fields: ['*'],
    })

    expect(res.name).toEqual('Lucas')
  })

  it('should support where on updateObject for additional check (acl for example)', async () => {
    const insertedObjects = await mongoAdapter.createObjects({
      className: 'User',
      data: [
        {
          name: 'Lucas',
          age: 20,
        },
        {
          name: 'LucasBis',
          age: 18,
        },
      ],
      fields: [],
      context,
    })

    expect(
      mongoAdapter.updateObject({
        className: 'User',
        where: {
          name: { equalTo: 'InvalidName' },
        },
        id: insertedObjects[0].id,
        context,
        data: { name: 'Lucas2' },
        fields: ['*'],
      }),
    ).rejects.toThrow('Object not found')

    const res = await mongoAdapter.updateObject({
      className: 'User',
      where: {
        name: { equalTo: 'Lucas' },
      },
      id: insertedObjects[0].id,
      context,
      data: { name: 'Lucas2' },
      fields: ['*'],
    })

    expect(res.name).toEqual('Lucas2')
  })

  it('should support where on delete for additional check (acl for example)', async () => {
    const insertedObjects = await mongoAdapter.createObjects({
      className: 'User',
      data: [
        {
          name: 'Lucas',
          age: 20,
        },
        {
          name: 'LucasBis',
          age: 18,
        },
      ],
      fields: [],
      context,
    })

    expect(
      mongoAdapter.deleteObject({
        className: 'User',
        where: {
          name: { equalTo: 'InvalidName' },
        },
        id: insertedObjects[0].id,
        context,
        fields: ['*'],
      }),
    ).rejects.toThrow('Object not found')

    await mongoAdapter.deleteObject({
      className: 'User',
      where: {
        name: { equalTo: 'Lucas' },
      },
      id: insertedObjects[0].id,
      context,
      fields: ['*'],
    })
  })

  it('should support notEqualTo on _id', async () => {
    const insertedObjects = await mongoAdapter.createObjects({
      className: 'User',
      data: [
        {
          name: 'Lucas',
          age: 20,
        },
        {
          name: 'LucasBis',
          age: 18,
        },
      ],
      fields: [],
      context,
    })

    const res = await mongoAdapter.getObjects({
      className: 'User',
      where: {
        id: { notEqualTo: insertedObjects[0].id },
      },
      context,
      fields: ['*'],
    })

    expect(res.length).toEqual(1)
  })

  it('should support equalTo on _id', async () => {
    const insertedObjects = await mongoAdapter.createObjects({
      className: 'User',
      data: [
        {
          name: 'Lucas',
          age: 20,
        },
        {
          name: 'LucasBis',
          age: 18,
        },
      ],
      fields: [],
      context,
    })

    const res = await mongoAdapter.getObjects({
      className: 'User',
      where: {
        id: { equalTo: insertedObjects[0].id },
      },
      context,
      fields: ['*'],
    })

    expect(res.length).toEqual(1)
  })

  it('should support $in aggregation on _id', async () => {
    const insertedObjects = await mongoAdapter.createObjects({
      className: 'User',
      data: [
        {
          name: 'Lucas',
          age: 20,
        },
        {
          name: 'LucasBis',
          age: 18,
        },
      ],
      fields: [],
      context,
    })

    const res = await mongoAdapter.getObjects({
      className: 'User',
      where: {
        id: { in: insertedObjects.map((obj) => obj.id) },
      },
      context,
      fields: ['*'],
    })

    expect(res.length).toEqual(2)
  })

  it('should support $nin aggregation on _id', async () => {
    const insertedObjects = await mongoAdapter.createObjects({
      className: 'User',
      data: [
        {
          name: 'Lucas',
          age: 20,
        },
        {
          name: 'LucasBis',
          age: 18,
        },
      ],
      fields: [],
      context,
    })

    const res = await mongoAdapter.getObjects({
      className: 'User',
      where: {
        id: { notIn: insertedObjects.map((obj) => obj.id) },
      },
      context,
      fields: ['*'],
    })

    expect(res.length).toEqual(0)
  })

  it('should create class', async () => {
    if (!mongoAdapter.database) fail()

    const spyCollection = spyOn(
      mongoAdapter.database,
      'collection',
    ).mockReturnValue({} as any)

    await mongoAdapter.createClassIfNotExist('User', context)

    expect(spyCollection).toHaveBeenCalledTimes(1)
    expect(spyCollection).toHaveBeenCalledWith('User')

    spyCollection.mockRestore()
  })

  it("should not create class if it's not connected", async () => {
    const cloneMongoAdapter = Object.assign(
      Object.create(Object.getPrototypeOf(mongoAdapter)),
      mongoAdapter,
    )
    cloneMongoAdapter.database = undefined

    expect(cloneMongoAdapter.createClassIfNotExist('User')).rejects.toThrow(
      'Connection to database is not established',
    )
  })

  it('should return id if an empty fields is specified', async () => {
    const insertedObjects = await mongoAdapter.createObjects({
      className: 'User',
      data: [
        {
          name: 'Lucas',
          age: 20,
        },
      ],
      fields: [],
      context,
    })

    if (!insertedObjects) fail()

    expect(insertedObjects[0].id).toBeDefined()
  })

  it('should always return id', async () => {
    const insertedObjects = await mongoAdapter.createObjects({
      className: 'User',
      data: [
        {
          name: 'Lucas',
          age: 20,
        },
      ],
      context,
      fields: ['age'],
    })

    if (!insertedObjects) fail

    expect(insertedObjects[0].id).toBeDefined()
  })

  it('should return id if no fields is specified', async () => {
    const insertedObjects = await mongoAdapter.createObjects({
      className: 'User',
      data: [
        {
          name: 'Lucas',
          age: 20,
        },
      ],
      context,
      fields: ['*'],
    })

    if (!insertedObjects) fail()

    expect(insertedObjects[0].id).toBeDefined()
  })

  it('should getObjects using id and not _id', async () => {
    const insertedObjects = await mongoAdapter.createObjects({
      className: 'User',
      data: [
        {
          name: 'Lucas',
          age: 20,
        },
        {
          name: 'Lucas1',
          age: 20,
        },
      ],
      fields: ['name', 'id'],
      context,
    })

    if (!insertedObjects) fail()

    const res = await mongoAdapter.getObjects({
      className: 'User',
      where: {
        id: {
          equalTo: ObjectId.createFromHexString(insertedObjects[0].id),
        },
      },
      context,
      fields: ['*'],
    })

    expect(res.length).toEqual(1)
  })

  it('should getObjects with limit and offset', async () => {
    await mongoAdapter.createObjects({
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
      context,
    })

    const res = await mongoAdapter.getObjects({
      className: 'User',
      fields: ['name'],
      first: 2,
      offset: 2,
      context,
    })

    expect(res.length).toEqual(2)
    expect(res[0].name).toEqual('John2')
    expect(res[1].name).toEqual('John3')
  })

  it('should get all the objects with limit', async () => {
    const res = await mongoAdapter.createObjects({
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
    const res = await mongoAdapter.createObjects({
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
      mongoAdapter.createObjects({
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

  it('should get all the objects without limit and without offset', async () => {
    await mongoAdapter.createObjects({
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
      context,
    })

    const res = await mongoAdapter.getObjects({
      className: 'User',
      fields: ['name'],
      context,
      where: {},
    })

    expect(res.length).toEqual(5)
  })

  it('should createObjects and deleteObjects with offset and limit', async () => {
    const res = await mongoAdapter.createObjects({
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
    expect(res[0].name).toEqual('John2')
    expect(res[1].name).toEqual('John3')

    await mongoAdapter.deleteObjects({
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

    const res2 = await mongoAdapter.getObjects({
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

  it('should get the _id of an object', async () => {
    const insertedObject = await mongoAdapter.createObject({
      className: 'User',
      data: {
        name: 'John',
        age: 20,
      },
      fields: ['name', 'id'],
      context,
    })

    const res = await mongoAdapter.getObject({
      id: insertedObject?.id.toString(),
      className: 'User',
      fields: ['id'],
      context,
    })

    expect(res?.id).toEqual(insertedObject?.id)
  })

  it('should get all fields when * is specified', async () => {
    const insertedObject = await mongoAdapter.createObject({
      className: 'User',
      data: {
        name: 'John',
        age: 20,
      },
      fields: ['name', 'id'],
      context,
    })

    if (!insertedObject) fail()

    const id = insertedObject.id

    expect(id).toBeDefined()

    const res = await mongoAdapter.getObject({
      className: 'User',
      id: id.toString(),
      fields: ['*'],
      context,
    })

    expect(res).toEqual(
      expect.objectContaining({
        name: 'John',
        age: 20,
        id: expect.any(String),
      }),
    )
  })

  it('should get one object with specific field and * fields', async () => {
    const insertedObject = await mongoAdapter.createObject({
      className: 'User',
      data: {
        name: 'John',
        age: 20,
      },
      fields: ['name', 'id'],
      context,
    })

    if (!insertedObject) fail()

    const id = insertedObject.id

    expect(id).toBeDefined()

    const field = await mongoAdapter.getObject({
      className: 'User',
      id: id.toString(),
      fields: ['name'],
      context,
    })

    expect(field).toEqual({
      name: 'John',
      id: expect.any(String),
    })
  })

  it('should get all object with specific field and * fields', async () => {
    const objects = await mongoAdapter.getObjects({
      className: 'User',
      fields: ['name'],
      context,
    })

    expect(objects.length).toEqual(0)

    await mongoAdapter.createObject({
      className: 'User',
      data: {
        name: 'John1',
        age: 20,
      },
      fields: ['name'],
      context,
    })

    await mongoAdapter.createObject({
      className: 'User',
      data: {
        name: 'John2',
        age: 20,
      },
      fields: ['name'],
      context,
    })

    const objects2 = await mongoAdapter.getObjects({
      className: 'User',
      fields: ['name', 'id'],
      context,
    })

    expect(objects2.length).toEqual(2)
    expect(objects2).toEqual([
      {
        id: expect.any(String),
        name: 'John1',
      },
      {
        id: expect.any(String),
        name: 'John2',
      },
    ])

    const objects3 = await mongoAdapter.getObjects({
      className: 'User',
      fields: ['name', 'id', 'age'],
      context,
    })

    expect(objects3.length).toEqual(2)
    expect(objects3).toEqual([
      {
        id: expect.any(String),
        name: 'John1',
        age: 20,
      },
      {
        id: expect.any(String),
        name: 'John2',
        age: 20,
      },
    ])
  })

  it('should get all objects with where filter', async () => {
    await mongoAdapter.createObject({
      className: 'User',
      data: {
        name: 'John1',
        age: 20,
      },
      fields: ['name'],
      context,
    })

    await mongoAdapter.createObject({
      className: 'User',
      data: {
        name: 'John2',
        age: 20,
      },
      fields: ['name'],
      context,
    })

    // OR statement
    expect(
      await mongoAdapter.getObjects({
        className: 'User',
        where: {
          OR: [
            {
              name: { equalTo: 'John1' },
            },
            {
              name: { equalTo: 'John2' },
            },
          ],
        },
        fields: ['name', 'id', 'age'],
        context,
      }),
    ).toEqual([
      {
        id: expect.any(String),
        name: 'John1',
        age: 20,
      },
      {
        id: expect.any(String),
        name: 'John2',
        age: 20,
      },
    ])

    expect(
      await mongoAdapter.getObjects({
        className: 'User',
        where: {
          OR: [
            {
              name: { equalTo: 'John1' },
            },
            {
              name: { equalTo: 'John3' },
            },
          ],
        },
        fields: ['name', 'id', 'age'],
        context,
      }),
    ).toEqual([
      {
        id: expect.any(String),
        name: 'John1',
        age: 20,
      },
    ])

    // AND statement
    expect(
      await mongoAdapter.getObjects({
        className: 'User',
        where: {
          AND: [
            {
              name: { equalTo: 'John1' },
            },
            {
              age: { equalTo: 20 },
            },
          ],
        },
        fields: ['name', 'id', 'age'],
        context,
      }),
    ).toEqual([
      {
        id: expect.any(String),
        name: 'John1',
        age: 20,
      },
    ])

    expect(
      await mongoAdapter.getObjects({
        className: 'User',
        where: {
          AND: [
            {
              name: { equalTo: 'John1' },
            },
            {
              age: { equalTo: 10 },
            },
          ],
        },
        context,
        fields: ['*'],
      }),
    ).toEqual([])

    // Equal to statement
    expect(
      await mongoAdapter.getObjects({
        className: 'User',
        where: {
          name: { equalTo: 'John1' },
        },
        fields: ['name', 'id', 'age'],
        context,
      }),
    ).toEqual([
      {
        id: expect.any(String),
        name: 'John1',
        age: 20,
      },
    ])

    expect(
      await mongoAdapter.getObjects({
        className: 'User',
        where: {
          age: { greaterThan: 21 },
        },
        context,
        fields: ['*'],
      }),
    ).toEqual([])

    // Not equal to statement
    expect(
      await mongoAdapter.getObjects({
        className: 'User',
        where: {
          name: { notEqualTo: 'John1' },
        },
        fields: ['name', 'id', 'age'],
        context,
      }),
    ).toEqual([
      {
        id: expect.any(String),
        name: 'John2',
        age: 20,
      },
    ])

    // Less than statement on string (not implemented)
    expect(
      await mongoAdapter.getObjects({
        className: 'User',
        where: {
          name: { lessThan: 'John1' },
        },
        context,
        fields: ['*'],
      }),
    ).toEqual([])

    // Less than to statement on number
    expect(
      await mongoAdapter.getObjects({
        className: 'User',
        where: {
          age: { lessThan: 30 },
        },
        fields: ['name', 'id', 'age'],
        context,
      }),
    ).toEqual([
      {
        id: expect.any(String),
        name: 'John1',
        age: 20,
      },
      {
        id: expect.any(String),
        name: 'John2',
        age: 20,
      },
    ])

    // Equal to statement on number
    expect(
      await mongoAdapter.getObjects({
        className: 'User',
        where: {
          age: { equalTo: 20 },
        },
        fields: ['name', 'id', 'age'],
        context,
      }),
    ).toEqual([
      {
        id: expect.any(String),
        name: 'John1',
        age: 20,
      },
      {
        id: expect.any(String),
        name: 'John2',
        age: 20,
      },
    ])
  })

  it("should throw object not found if the object doesn't exist", async () => {
    expect(
      mongoAdapter.getObject({
        className: 'User',
        id: '5f9b3b3b3b3b3b3b3b3b3b3b',
        fields: ['name'],
        context,
      }),
    ).rejects.toThrow('Object not found')
  })

  it('should create object and return the created object', async () => {
    const insertedObject = await mongoAdapter.createObject({
      className: 'User',
      data: {
        name: 'Lucas',
        age: 23,
      },
      fields: ['age', 'id'],
      context,
    })

    expect(insertedObject).toEqual({ age: 23, id: expect.any(String) })

    const insertedObject2 = await mongoAdapter.createObject({
      className: 'User',
      data: {
        name: 'Lucas2',
        age: 24,
      },
      fields: ['name', 'id', 'age'],
      context,
    })

    expect(insertedObject2).toEqual({
      age: 24,
      id: expect.any(String),
      name: 'Lucas2',
    })
  })

  it('should create multiple objects and return an array of the created object', async () => {
    const insertedObjects = await mongoAdapter.createObjects({
      className: 'User',
      data: [
        {
          name: 'Lucas3',
          age: 23,
        },
        {
          name: 'Lucas4',
          age: 24,
        },
      ],
      fields: ['name', 'id'],
      context,
    })

    expect(insertedObjects).toEqual([
      {
        id: expect.any(String),
        name: 'Lucas3',
      },
      {
        id: expect.any(String),
        name: 'Lucas4',
      },
    ])
  })

  it('should create multiple objects and return an array of the created object with * fields', async () => {
    const insertedObjects = await mongoAdapter.createObjects({
      className: 'User',
      data: [
        {
          name: 'Lucas3',
          age: 23,
        },
        {
          name: 'Lucas4',
          age: 24,
        },
      ],
      fields: ['name', 'id', 'age'],
      context,
    })

    expect(insertedObjects).toEqual([
      {
        id: expect.any(String),
        name: 'Lucas3',
        age: 23,
      },
      {
        id: expect.any(String),
        name: 'Lucas4',
        age: 24,
      },
    ])
  })

  it('should update object', async () => {
    const insertedObject = await mongoAdapter.createObject({
      className: 'User',
      data: {
        name: 'John',
        age: 20,
      },
      context,
      fields: ['*'],
    })

    if (!insertedObject) fail()

    const id = insertedObject.id

    const updatedObject = await mongoAdapter.updateObject({
      className: 'User',
      id: id.toString(),
      data: { name: 'Doe' },
      fields: ['name', 'id'],
      context,
    })

    if (!updatedObject) fail()

    expect(updatedObject).toEqual({
      name: 'Doe',
      id: expect.any(String),
    })

    const updatedObject2 = await mongoAdapter.updateObject({
      className: 'User',
      id: id.toString(),
      data: { name: 'Doe' },
      fields: ['name', 'id', 'age'],
      context,
    })

    if (!updatedObject2) fail()

    expect(updatedObject2).toEqual({
      id: expect.any(String),
      name: 'Doe',
      age: 20,
    })
  })

  it('should update multiple objects', async () => {
    const insertedObjects = await mongoAdapter.createObjects({
      className: 'User',
      data: [
        {
          name: 'Lucas',
          age: 20,
        },
        {
          name: 'Lucas1',
          age: 20,
        },
      ],
      context,
      fields: ['*'],
    })

    if (!insertedObjects) fail()

    const updatedObjects = await mongoAdapter.updateObjects({
      className: 'User',
      where: {
        name: { equalTo: 'Lucas' },
      },
      data: { age: 21 },
      fields: ['name', 'id', 'age'],
      context,
    })

    expect(updatedObjects).toEqual([
      {
        id: expect.any(String),
        name: 'Lucas',
        age: 21,
      },
    ])

    const updatedObjects2 = await mongoAdapter.updateObjects({
      className: 'User',
      where: {
        age: { greaterThanOrEqualTo: 20 },
      },
      data: { age: 23 },
      fields: ['name', 'id', 'age'],
      context,
    })

    expect(updatedObjects2).toEqual([
      {
        id: expect.any(String),
        name: 'Lucas',
        age: 23,
      },
      {
        id: expect.any(String),
        name: 'Lucas1',
        age: 23,
      },
    ])
  })

  it('should update the same field of an objet that which we use in the where field', async () => {
    const insertedObject = await mongoAdapter.createObject({
      className: 'User',
      data: {
        name: 'John',
        age: 20,
      },
      context,
      fields: ['*'],
    })

    if (!insertedObject) fail()

    const updatedObjects = await mongoAdapter.updateObjects({
      className: 'User',
      data: { name: 'Doe' },
      where: {
        name: {
          equalTo: 'John',
        },
      },
      fields: ['age', 'id'],
      context,
    })

    expect(updatedObjects).toEqual([
      {
        id: expect.any(String),
        age: 20,
      },
    ])
  })

  it('should delete one object', async () => {
    const insertedObject = await mongoAdapter.createObject({
      className: 'User',
      data: {
        name: 'John',
        age: 20,
      },
      context,
      fields: ['*'],
    })

    if (!insertedObject) fail()

    const id = insertedObject.id

    await mongoAdapter.deleteObject({
      className: 'User',
      id: id.toString(),
      fields: ['name', 'id', 'age'],
      context,
    })

    expect(
      mongoAdapter.getObject({
        className: 'User',
        id: id.toString(),
        context,
        fields: ['*'],
      }),
    ).rejects.toThrow('Object not found')
  })

  it('should delete multiple object', async () => {
    await mongoAdapter.createObject({
      className: 'User',
      data: {
        name: 'John',
        age: 18,
      },
      context,
      fields: ['*'],
    })

    await mongoAdapter.createObject({
      className: 'User',
      data: {
        name: 'Lucas',
        age: 18,
      },
      context,
      fields: ['*'],
    })

    await mongoAdapter.deleteObjects({
      className: 'User',
      where: { age: { equalTo: 18 } },
      fields: ['name', 'id', 'age'],
      context,
    })

    const resAfterDelete = await mongoAdapter.getObjects({
      className: 'User',
      where: { age: { equalTo: 18 } },
      context,
      fields: ['*'],
    })

    expect(resAfterDelete.length).toEqual(0)
  })

  it('should build where query with equalTo null', async () => {
    const where = buildMongoWhereQuery({
      // @ts-expect-error
      acl: { equalTo: null },
    })

    expect(where).toEqual({
      acl: null,
    })
  })

  it('should build where query for mongo adapter', () => {
    const where = buildMongoWhereQuery({
      name: { equalTo: 'John' },
      age: { greaterThan: 20 },
      OR: [
        {
          // @ts-expect-error
          age: { lessThan: 10 },
        },
        {
          // @ts-expect-error
          name: { equalTo: 'John' },
        },
        {
          OR: [
            {
              // @ts-expect-error
              name: { equalTo: 'Tata' },
            },
          ],
        },
      ],
      AND: [
        {
          // @ts-expect-error
          age: { lessThan: 10 },
        },
        {
          // @ts-expect-error
          name: { equalTo: 'John' },
        },
        {
          AND: [
            {
              // @ts-expect-error
              name: { equalTo: 'Tata' },
            },
          ],
        },
      ],
    })

    expect(where).toEqual({
      name: 'John',
      age: { $gt: 20 },
      $or: [
        { age: { $lt: 10 } },
        { name: 'John' },
        { $or: [{ name: 'Tata' }] },
      ],
      $and: [
        { age: { $lt: 10 } },
        { name: 'John' },
        { $and: [{ name: 'Tata' }] },
      ],
    })
  })

  it('should build empty where query for mongoAdapter if where is empty', () => {
    const where = buildMongoWhereQuery({})

    expect(where).toEqual({})
  })

  it('should build empty where query for mongoAdapter if operation not exist', () => {
    // @ts-expect-error
    const where = buildMongoWhereQuery({ name: { notExist: 'John' } })

    expect(where).toEqual({})
  })

  it('should build empty where query for mongoAdapter if operation not exist', () => {
    // @ts-expect-error
    const where = buildMongoWhereQuery({ name: { notExist: 'John' } })

    expect(where).toEqual({})
  })

  it('should request sub object in object', async () => {
    await mongoAdapter.createObject({
      className: 'User',
      context,
      data: {
        authentication: {
          emailPassword: {
            email: 'email@test.fr',
            password: 'password',
          },
        },
      },
      fields: ['*'],
    })

    const res = await mongoAdapter.getObjects({
      className: 'User',
      where: {
        authentication: {
          // @ts-expect-error
          emailPassword: {
            email: { equalTo: 'email@test.fr' },
          },
        },
      },
      context,
      fields: ['authentication'],
    })

    expect(res.length).toEqual(1)
    expect(res[0].authentication?.emailPassword?.email).toEqual('email@test.fr')
    expect(res[0].authentication?.emailPassword?.password).toEqual('password')
  })

  it('should request sub object in object with selection fields', async () => {
    await mongoAdapter.createObject({
      className: 'User',
      context,
      data: {
        authentication: {
          emailPassword: {
            email: 'email@test.fr',
            password: 'password',
          },
        },
      },
      fields: ['*'],
    })

    const res = await mongoAdapter.getObjects({
      className: 'User',
      where: {
        authentication: {
          // @ts-expect-error
          emailPassword: {
            email: { equalTo: 'email@test.fr' },
          },
        },
      },
      context,
      // @ts-expect-error
      fields: ['authentication.emailPassword.email'],
    })

    expect(res.length).toEqual(1)
    expect(res[0].authentication?.emailPassword?.email).toEqual('email@test.fr')
    expect(res[0].authentication?.emailPassword?.password).toBeUndefined()
  })
})
