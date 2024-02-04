import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'bun:test'
import { fail } from 'assert'
import { closeTests, setupTests } from '../../utils/helper'
import { MongoAdapter, buildMongoWhereQuery } from './MongoAdapter'
import { WibeApp } from '../../server'
import { ObjectId } from 'mongodb'
import { _User } from '../../../generated/wibe'

describe('Mongo adapter', () => {
    let mongoAdapter: MongoAdapter
    let wibe: WibeApp

    beforeAll(async () => {
        const setup = await setupTests()
        wibe = setup.wibe

        mongoAdapter = WibeApp.databaseController.adapter as MongoAdapter
    })

    afterAll(async () => {
        await closeTests(wibe)
    })

    beforeEach(async () => {
        const collections = await mongoAdapter.database?.collections()

        if (collections)
            await Promise.all(
                collections?.map((collection) => collection.drop()),
            )
    })

    it('should getObjects using id and not _id', async () => {
        const insertedObjects = await mongoAdapter.createObjects({
            className: '_User',
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
        })

        if (!insertedObjects) fail()

        const res = await mongoAdapter.getObjects({
            className: '_User',
            where: {
                id: { equalTo: new ObjectId(insertedObjects[0].id) },
            },
        })

        expect(res.length).toEqual(1)
    })

    it('should getObjects with limit and offset', async () => {
        await mongoAdapter.createObjects({
            className: '_User',
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
        })

        const res = await mongoAdapter.getObjects({
            className: '_User',
            fields: ['name'],
            limit: 2,
            offset: 2,
        })

        expect(res.length).toEqual(2)
        expect(res[0].name).toEqual('John2')
        expect(res[1].name).toEqual('John3')
    })

    it('should get all the objects with limit', async () => {
        const res = await mongoAdapter.createObjects({
            className: '_User',
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
            limit: 2,
        })

        expect(res.length).toEqual(2)
    })

    // For the moment we keep the mongodb behavior for the negative value (for limit)
    // https://www.mongodb.com/docs/manual/reference/method/cursor.limit/#negative-values
    it('should get all the objects with negative limit and offset', async () => {
        const res = await mongoAdapter.createObjects({
            className: '_User',
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
            limit: -2,
        })

        expect(res.length).toEqual(2)

        expect(
            mongoAdapter.createObjects({
                className: '_User',
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
            }),
        ).rejects.toThrow(
            "BSON field 'skip' value must be >= 0, actual value '-2'",
        )
    })

    it('should get all the objects without limit and without offset', async () => {
        await mongoAdapter.createObjects({
            className: '_User',
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
        })

        const res = await mongoAdapter.getObjects({
            className: '_User',
            fields: ['name'],
        })

        expect(res.length).toEqual(5)
    })

    it('should createObjects and deleteObjects with offset and limit', async () => {
        const res = await mongoAdapter.createObjects({
            className: '_User',
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
            limit: 2,
            offset: 2,
        })

        expect(res.length).toEqual(2)
        expect(res[0].name).toEqual('John2')
        expect(res[1].name).toEqual('John3')

        const res2 = await mongoAdapter.deleteObjects({
            className: '_User',
            where: {
                OR: [
                    { name: { equalTo: 'John2' } },
                    { name: { equalTo: 'John3' } },
                    { name: { equalTo: 'John4' } },
                ],
            },
            fields: ['name'],
            limit: 2,
            offset: 1,
        })

        expect(res2.length).toEqual(2)
        expect(res2[0].name).toEqual('John3')
        expect(res2[1].name).toEqual('John4')
    })

    it('should create class', async () => {
        expect((await mongoAdapter.database?.collections())?.length).toBe(0)

        await mongoAdapter.createClass('_User')

        const collections = await mongoAdapter.database?.collections()

        if (!collections) fail()

        expect((await mongoAdapter.database?.collections())?.length).toBe(1)
        expect(collections[0].collectionName).toBe('_User')
    })

    it('should get the _id of an object', async () => {
        const insertedObject = await mongoAdapter.createObject({
            className: '_User',
            data: {
                name: 'John',
                age: 20,
            },
            fields: ['name', 'id'],
        })

        const res = await mongoAdapter.getObject({
            id: insertedObject?.id.toString(),
            className: '_User',
            fields: ['id'],
        })

        expect(res?.id).toEqual(insertedObject?.id)

        const res2 = await mongoAdapter.getObject({
            id: insertedObject?.id.toString(),
            className: '_User',
            fields: ['name'],
        })

        // @ts-expect-error
        expect(res2.id).toEqual(undefined)
    })

    it("should not create class if it's not connected", async () => {
        const cloneMongoAdapter = Object.assign(
            Object.create(Object.getPrototypeOf(mongoAdapter)),
            mongoAdapter,
        )
        cloneMongoAdapter.database = undefined

        expect(cloneMongoAdapter.createClass('_User')).rejects.toThrow(
            'Connection to database is not established',
        )
    })

    it('should get one object with specific field and * fields', async () => {
        const insertedObject = await mongoAdapter.createObject({
            className: '_User',
            data: {
                name: 'John',
                age: 20,
            },
            fields: ['name', 'id'],
        })

        if (!insertedObject) fail()

        const id = insertedObject.id

        expect(id).toBeDefined()

        const field = await mongoAdapter.getObject({
            className: '_User',
            id: id.toString(),
            fields: ['name'],
        })

        expect(field).toEqual({
            name: 'John',
        })
    })

    it('should get all object with specific field and * fields', async () => {
        const objects = await mongoAdapter.getObjects({
            className: '_User',
            fields: ['name'],
        })

        expect(objects.length).toEqual(0)

        await mongoAdapter.createObject({
            className: '_User',
            data: {
                name: 'John1',
                age: 20,
            },
            fields: ['name'],
        })

        await mongoAdapter.createObject({
            className: '_User',
            data: {
                name: 'John2',
                age: 20,
            },
            fields: ['name'],
        })

        const objects2 = await mongoAdapter.getObjects({
            className: '_User',
            fields: ['name', 'id'],
        })

        expect(objects2.length).toEqual(2)
        expect(objects2).toEqual([
            {
                id: expect.anything(),
                name: 'John1',
            },
            {
                id: expect.anything(),
                name: 'John2',
            },
        ])

        const objects3 = await mongoAdapter.getObjects({
            className: '_User',
        })

        expect(objects3.length).toEqual(2)
        expect(objects3).toEqual([
            {
                id: expect.anything(),
                name: 'John1',
                age: 20,
            },
            {
                id: expect.anything(),
                name: 'John2',
                age: 20,
            },
        ])
    })

    it('should get all objects with where filter', async () => {
        await mongoAdapter.createObject({
            className: '_User',
            data: {
                name: 'John1',
                age: 20,
            },
            fields: ['name'],
        })

        await mongoAdapter.createObject({
            className: '_User',
            data: {
                name: 'John2',
                age: 20,
            },
            fields: ['name'],
        })

        // OR statement
        expect(
            await mongoAdapter.getObjects({
                className: '_User',
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
            }),
        ).toEqual([
            {
                id: expect.anything(),
                name: 'John1',
                age: 20,
            },
            {
                id: expect.anything(),
                name: 'John2',
                age: 20,
            },
        ])

        expect(
            await mongoAdapter.getObjects({
                className: '_User',
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
            }),
        ).toEqual([
            {
                id: expect.anything(),
                name: 'John1',
                age: 20,
            },
        ])

        // AND statement
        expect(
            await mongoAdapter.getObjects({
                className: '_User',

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
            }),
        ).toEqual([
            {
                id: expect.anything(),
                name: 'John1',
                age: 20,
            },
        ])

        expect(
            await mongoAdapter.getObjects({
                className: '_User',
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
            }),
        ).toEqual([])

        // Equal to statement
        expect(
            await mongoAdapter.getObjects({
                className: '_User',
                where: {
                    name: { equalTo: 'John1' },
                },
            }),
        ).toEqual([
            {
                id: expect.anything(),
                name: 'John1',
                age: 20,
            },
        ])

        expect(
            await mongoAdapter.getObjects({
                className: '_User',
                where: {
                    age: { greaterThan: 21 },
                },
            }),
        ).toEqual([])

        // Not equal to statement
        expect(
            await mongoAdapter.getObjects({
                className: '_User',
                where: {
                    name: { notEqualTo: 'John1' },
                },
            }),
        ).toEqual([
            {
                id: expect.anything(),
                name: 'John2',
                age: 20,
            },
        ])

        // Less than statement on string (not implemented)
        expect(
            await mongoAdapter.getObjects({
                className: '_User',
                where: {
                    name: { lessThan: 'John1' },
                },
            }),
        ).toEqual([])

        // Less than to statement on number
        expect(
            await mongoAdapter.getObjects({
                className: '_User',
                where: {
                    age: { lessThan: 30 },
                },
            }),
        ).toEqual([
            {
                id: expect.anything(),
                name: 'John1',
                age: 20,
            },
            {
                id: expect.anything(),
                name: 'John2',
                age: 20,
            },
        ])

        // Equal to statement on number
        expect(
            await mongoAdapter.getObjects({
                className: '_User',
                where: {
                    age: { equalTo: 20 },
                },
            }),
        ).toEqual([
            {
                id: expect.anything(),
                name: 'John1',
                age: 20,
            },
            {
                id: expect.anything(),
                name: 'John2',
                age: 20,
            },
        ])
    })

    it("should return null if the object doesn't exist", async () => {
        expect(
            await mongoAdapter.getObject({
                className: 'Collection1',
                id: '5f9b3b3b3b3b3b3b3b3b3b3b',
                fields: ['name'],
            }),
        ).toEqual(null)
    })

    it('should create object and return the created object', async () => {
        const insertedObject = await mongoAdapter.createObject({
            className: '_User',
            data: {
                name: 'Lucas',
                age: 23,
            },
            fields: ['age'],
        })

        expect(insertedObject).toEqual({ age: 23, id: expect.anything() })

        const insertedObject2 = await mongoAdapter.createObject({
            className: '_User',
            data: {
                name: 'Lucas2',
                age: 24,
            },
        })

        expect(insertedObject2).toEqual({
            age: 24,
            id: expect.anything(),
            name: 'Lucas2',
        })
    })

    it('should create multiple objects and return an array of the created object', async () => {
        const insertedObjects = await mongoAdapter.createObjects({
            className: '_User',
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
            fields: ['name'],
        })

        expect(insertedObjects).toEqual([
            {
                id: expect.anything(),
                name: 'Lucas3',
            },
            {
                id: expect.anything(),
                name: 'Lucas4',
            },
        ])
    })

    it('should create multiple objects and return an array of the created object with * fields', async () => {
        const insertedObjects = await mongoAdapter.createObjects({
            className: '_User',
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
        })

        expect(insertedObjects).toEqual([
            {
                id: expect.anything(),
                name: 'Lucas3',
                age: 23,
            },
            {
                id: expect.anything(),
                name: 'Lucas4',
                age: 24,
            },
        ])
    })

    it('should update object', async () => {
        const insertedObject = await mongoAdapter.createObject({
            className: '_User',
            data: {
                name: 'John',
                age: 20,
            },
        })

        if (!insertedObject) fail()

        const id = insertedObject.id

        const updatedObject = await mongoAdapter.updateObject({
            className: '_User',
            id: id.toString(),
            data: { name: 'Doe' },
            fields: ['name'],
        })

        if (!updatedObject) fail()

        expect(updatedObject).toEqual({
            name: 'Doe',
            id: expect.anything(),
        })

        const updatedObject2 = await mongoAdapter.updateObject({
            className: '_User',
            id: id.toString(),
            data: { name: 'Doe' },
        })

        if (!updatedObject2) fail()

        expect(updatedObject2).toEqual({
            id: expect.anything(),
            name: 'Doe',
            age: 20,
        })
    })

    it('should update multiple objects', async () => {
        const insertedObjects = await mongoAdapter.createObjects({
            className: '_User',
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
        })

        if (!insertedObjects) fail()

        const updatedObjects = await mongoAdapter.updateObjects({
            className: '_User',
            where: {
                name: { equalTo: 'Lucas' },
            },
            data: { age: 21 },
        })

        expect(updatedObjects).toEqual([
            {
                id: expect.anything(),
                name: 'Lucas',
                age: 21,
            },
        ])

        const updatedObjects2 = await mongoAdapter.updateObjects({
            className: '_User',
            where: {
                age: { greaterThanOrEqualTo: 20 },
            },
            data: { age: 23 },
        })

        expect(updatedObjects2).toEqual([
            {
                id: expect.anything(),
                name: 'Lucas',
                age: 23,
            },
            {
                id: expect.anything(),
                name: 'Lucas1',
                age: 23,
            },
        ])
    })

    it('should update the same field of an objet that which we use in the where field', async () => {
        const insertedObject = await mongoAdapter.createObject({
            className: '_User',
            data: {
                name: 'John',
                age: 20,
            },
        })

        if (!insertedObject) fail()

        const updatedObjects = await mongoAdapter.updateObjects({
            className: '_User',
            data: { name: 'Doe' },
            where: {
                name: {
                    equalTo: 'John',
                },
            },
            fields: ['age'],
        })

        expect(updatedObjects).toEqual([
            {
                id: expect.anything(),
                age: 20,
            },
        ])
    })

    it('should delete one object', async () => {
        const insertedObject = await mongoAdapter.createObject({
            className: '_User',
            data: {
                name: 'John',
                age: 20,
            },
        })

        if (!insertedObject) fail()

        const id = insertedObject.id

        const deletedObject = await mongoAdapter.deleteObject({
            className: '_User',
            id: id.toString(),
        })

        if (!deletedObject) fail()

        expect(deletedObject).toEqual({
            id: expect.anything(),
            name: 'John',
            age: 20,
        })
    })

    it("should not delete an user that doesn't exist", async () => {
        const res = await mongoAdapter.deleteObject({
            className: '_User',
            id: '5f9b3b3b3b3b3b3b3b3b3b3b',
        })

        expect(res).toEqual(null)
    })

    it('should delete multiple object', async () => {
        await mongoAdapter.createObject({
            className: '_User',
            data: {
                name: 'John',
                age: 18,
            },
        })

        await mongoAdapter.createObject({
            className: '_User',
            data: {
                name: 'Lucas',
                age: 18,
            },
        })

        const deletedObjects = await mongoAdapter.deleteObjects({
            className: '_User',
            where: { age: { equalTo: 18 } },
        })

        if (!deletedObjects) fail()

        expect(deletedObjects).toEqual([
            {
                id: expect.anything(),
                name: 'John',
                age: 18,
            },
            {
                id: expect.anything(),
                name: 'Lucas',
                age: 18,
            },
        ])
    })

    it('should build where query for mongo adapter', () => {
        const where = buildMongoWhereQuery({
            name: { equalTo: 'John' },
            age: { greaterThan: 20 },
            OR: [
                {
                    age: { lessThan: 10 },
                },
                { name: { equalTo: 'John' } },
                {
                    OR: [
                        {
                            name: { equalTo: 'Tata' },
                        },
                    ],
                },
            ],
            AND: [
                {
                    age: { lessThan: 10 },
                },
                { name: { equalTo: 'John' } },
                {
                    AND: [
                        {
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
})
