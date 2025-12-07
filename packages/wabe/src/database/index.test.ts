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
	getAdminUserClient,
	getGraphqlClient,
} from '../utils/helper'
import { setupTests, closeTests } from '../utils/testHelper'
import type { WabeContext } from '../server/interface'
import { OperationType, getDefaultHooks } from '../hooks'
import { gql } from 'graphql-request'
import { contextWithRoot } from '../utils/export'

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
			select: {},
		})
	})

	const mockAfterUpdate = mock(async () => {
		await context.wabe.controllers.database.createObjects({
			className: 'Test2',
			data: [{ name: 'test' }],
			context,
			select: {},
		})
	})

	let spyGetObjects: Mock<any>
	let spyGetObject: Mock<any>

	beforeAll(async () => {
		const setup = await setupTests([
			{
				name: 'Test',
				fields: {
					name: { type: 'String' },
				},
				permissions: {
					read: {
						authorizedRoles: [],
						requireAuthentication: true,
					},
					create: {
						authorizedRoles: ['Client'],
						requireAuthentication: true,
					},
				},
			},
			{
				name: 'Test2',
				fields: {
					name: { type: 'String' },
					age: { type: 'Int' },
					userTest: { type: 'Relation', class: 'User' },
					userTest2: { type: 'Pointer', class: 'User' },
					test3: { type: 'Relation', class: 'Test3' },
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
			{
				name: 'Test3',
				fields: {
					name: { type: 'String' },
					test2: { type: 'Pointer', class: 'Test2' },
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

	it('should return id of a relation if set to true in select on getObject', async () => {
		const rootClient = getGraphqlClient(wabe.config.port)

		const createdObject = await rootClient.request<any>(gql`
        mutation createTest2{
            createTest2(input: {fields : {test3: {createAndAdd: [{name: "test"}]}}}) {
                test2{
                    id
                    test3{
                        edges {
                            node {
                                name
                            }
                        }
                    }
                }
            }
        }
      `)

		const res = await wabe.controllers.database.getObject({
			// @ts-expect-error
			className: 'Test2',
			context,
			id: createdObject.createTest2.test2.id,
			select: {
				id: true,
				// @ts-expect-error
				test3: true,
			},
		})

		// @ts-expect-error
		expect(res.test3[0]).toEqual(
			expect.objectContaining({
				id: expect.any(String),
			}),
		)
	})

	it('should be able to create an object with a relation and a pointer', async () => {
		const rootClient = getGraphqlClient(wabe.config.port)

		const res = await rootClient.request<any>(gql`
        mutation createTest2{
            createTest2(input: {fields : {userTest: {createAndAdd: [{name: "test"}]}}}) {
                test2{
                    id
                    userTest{
                        edges {
                            node {
                                name
                            }
                        }
                    }
                }
            }
        }
      `)

		expect(res.createTest2.test2.userTest.edges[0].node.name).toEqual('test')

		const res2 = await rootClient.request<any>(gql`
        mutation createTest2{
            createTest2(input: {fields : {userTest2: {createAndLink: {name: "test"}}}}) {
                test2{
                    id
                    userTest2{
                        name
                    }
                }
            }
        }
      `)

		expect(res2.createTest2.test2.userTest2.name).toEqual('test')
	})

	it('should not return point data whe no pointer is present on the object', async () => {
		const rootClient = getGraphqlClient(wabe.config.port)

		await rootClient.request<any>(gql`
        mutation createTest2{
            createTest2(input: {fields : {age: 20}}) {
                test2{
                    id
                    userTest2{
                        id
                    }
                }
            }
        }
    `)

		await rootClient.request<any>(gql`
        mutation createTest2{
            createTest2(input: {fields : {userTest2: {createAndLink: {name: "test"}}}}) {
                test2{
                    id
                }
            }
        }
      `)

		const res = await rootClient.request<any>(gql`
      query test2s{
        test2s{
          edges {
              node {
                id
                userTest2{
                    id
                }
              }
          }
        }
      }
    `)

		expect(res.test2s.edges[0].node.userTest2).toBeNull()
		expect(res.test2s.edges[1].node.userTest2.id).toBeDefined()
	})

	it('should not return all relation when no array of id is present on the object', async () => {
		const rootClient = getGraphqlClient(wabe.config.port)

		await rootClient.request<any>(gql`
        mutation createTest2{
            createTest2(input: {fields : {age: 20}}) {
                test2{
                    id
                    userTest{
                        edges {
                            node {
                                name
                            }
                        }
                    }
                }
            }
        }
    `)

		await rootClient.request<any>(gql`
        mutation createTest2{
            createTest2(input: {fields : {userTest: {createAndAdd: [{name: "test"}]}}}) {
                test2{
                    id
                    userTest{
                        edges {
                            node {
                                name
                            }
                        }
                    }
                }
            }
        }
      `)

		const res = await rootClient.request<any>(gql`
      query test2s{
        test2s{
          edges {
              node {
                id
                userTest{
                edges {
                    node {
                    name
                    }
                }
                }
              }
          }
        }
      }
    `)

		expect(res.test2s.edges[0].node.userTest).toBeNull()
		expect(res.test2s.edges[1].node.userTest.edges.length).toEqual(1)
	})

	it('should return correct data and type for relation with databaseController with created object', async () => {
		const createdUserObject = await wabe.controllers.database.createObject({
			className: 'User',
			context,
			data: {
				name: 'test',
			},
		})

		await wabe.controllers.database.createObject({
			// @ts-expect-error
			className: 'Test2',
			select: {},
			context,
			data: {
				// @ts-expect-error
				userTest: [createdUserObject?.id],
			},
		})

		const res = await wabe.controllers.database.getObjects({
			// @ts-expect-error
			className: 'Test2',
			context,
			select: {
				id: true,
				// @ts-expect-error
				userTest: {
					id: true,
					name: true,
				},
			},
		})

		// @ts-expect-error
		expect(res[0].userTest).toEqual([{ name: 'test', id: expect.any(String) }])
	})

	it("should return null on a pointer if the pointer doesn't exist", async () => {
		await getGraphqlClient(wabe.config.port).request<any>(graphql.signUpWith, {
			input: {
				authentication: {
					emailPassword: {
						email: 'email@test.com',
						password: 'password,',
					},
				},
			},
		})

		const res = await wabe.controllers.database.getObjects({
			className: 'User',
			context,
			select: {
				id: true,
				role: true,
			},
		})

		expect(res[0]?.role).toBeNull()
	})

	it('should return all the pointer data when we set the relation class to true in select', async () => {
		await getAdminUserClient(context.wabe.config.port, context.wabe, {
			email: 'email@test.fr',
			password: 'password',
		})

		const res = await wabe.controllers.database.getObjects({
			className: 'User',
			context,
			select: {
				id: true,
				role: true,
			},
		})

		expect(res[0]?.role).toEqual(
			expect.objectContaining({
				name: 'Admin',
				id: expect.any(String),
			}),
		)
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
			select: { id: true },
			context,
		})

		await wabe.controllers.database.deleteObject({
			className: 'User',
			context,
			select: { id: true },
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
			select: { id: true },
			context,
		})

		await wabe.controllers.database.deleteObjects({
			className: 'User',
			context,
			select: { id: true },
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
			select: { id: true },
			context,
		})

		await wabe.controllers.database.updateObject({
			className: 'User',
			context,
			select: { id: true },
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
			select: { id: true },
			context,
		})

		await wabe.controllers.database.updateObjects({
			className: 'User',
			context,
			select: { id: true },
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
			select: { name: true, id: true },
			first: 2,
			context,
		})

		expect(res.length).toEqual(2)
	})

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
			select: { name: true, id: true },
			context,
		})

		expect(res.length).toEqual(5)

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
				select: { name: true, id: true },
				offset: -2,
				context,
			}),
		).rejects.toThrow()
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
			select: { name: true, id: true },
			first: 2,
			offset: 2,
			order: { name: 'ASC' },
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
			select: { name: true },
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
		})

		expect(res2.length).toEqual(0)
	})

	it('should return null on createObject when no fields are provided', async () => {
		const res = await wabe.controllers.database.createObject({
			className: 'User',
			context,
			data: { name: 'Lucas' },
			select: {},
		})

		expect(res).toBeNull()
	})

	it('should return empty array on createObjects when no fields are provided', async () => {
		const res = await wabe.controllers.database.createObjects({
			className: 'User',
			context,
			data: [{ name: 'Lucas' }],
			select: {},
		})

		expect(res).toBeEmpty()
	})

	it('should return null on updateObject when no fields are provided', async () => {
		const createdObject = await wabe.controllers.database.createObject({
			className: 'User',
			context,
			data: { name: 'Lucas' },
			select: { id: true },
		})

		const res = await wabe.controllers.database.updateObject({
			className: 'User',
			context,
			data: { name: 'Lucas' },
			select: {},
			id: createdObject?.id || '',
		})

		expect(res).toBeNull()
	})

	it('should return empty array on updateObjects when no fields are provided', async () => {
		await wabe.controllers.database.createObject({
			className: 'User',
			context,
			data: { name: 'Lucas' },
			select: { id: true },
		})

		const res = await wabe.controllers.database.updateObjects({
			className: 'User',
			context,
			data: { name: 'Lucas2' },
			select: {},
			where: { name: { equalTo: 'Lucas' } },
		})

		expect(res).toBeEmpty()
	})

	it('should return null on deleteObject when no fields are provided', async () => {
		const createdObject = await wabe.controllers.database.createObject({
			className: 'User',
			context,
			data: { name: 'Lucas' },
			select: { id: true },
		})

		const res = await wabe.controllers.database.deleteObject({
			className: 'User',
			context,
			select: {},
			id: createdObject?.id || '',
		})

		expect(res).toBeNull()
	})

	it('should return empty array on deleteObjects when no fields are provided', async () => {
		await wabe.controllers.database.createObject({
			className: 'User',
			context,
			data: { name: 'Lucas' },
			select: { id: true },
		})

		const res = await wabe.controllers.database.deleteObjects({
			className: 'User',
			context,
			select: {},
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
			context: contextWithRoot(context),
			data: {
				name: 'Doe',
			},
			select: {},
		})

		const {
			users: { edges },
		} = await adminClient.request<any>(graphql.users)

		expect(edges.length).toEqual(1)
		expect(edges[0]?.node?.email).toEqual('email@test.fr')
		expect(edges[0]?.node?.role?.name).toEqual('Admin')
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
			select: {},
		})

		const res = await wabe.controllers.database.getObjects({
			className: 'User',
			context,
			select: { name: true },
			order: { name: 'ASC' },
		})

		expect(res[0]?.name).toBe('test1')
		expect(res[1]?.name).toBe('test2')
	})

	it('should create object with subobject (hooks default call authentication before create user)', async () => {
		const res = await wabe.controllers.database.createObject({
			className: 'User',
			context,
			select: { authentication: true },
			data: {
				provider: 'Google',
				isOauth: true,
				authentication: {
					google: {
						email: 'email@test.fr',
						verifiedEmail: true,
					},
				},
			},
		})

		expect(res?.authentication?.google).toEqual({
			email: 'email@test.fr',
			verifiedEmail: true,
		})
	})

	it('should not computeObject in runOnSingleObject if there is no hooks to execute on createObject', async () => {
		wabe.config.hooks = []

		await wabe.controllers.database.createObject({
			className: 'User',
			context,
			data: { name: 'Lucas' },
			select: { id: true },
		})

		expect(spyGetObject).toHaveBeenCalledTimes(1)
	})

	it('should not computeObjects in runOnMultipleObjects if there is no hooks to execute on createObjects', async () => {
		wabe.config.hooks = []

		await wabe.controllers.database.createObjects({
			className: 'User',
			context,
			data: [{ name: 'Lucas' }],
			select: { id: true },
		})

		expect(spyGetObjects).toHaveBeenCalledTimes(1)
	})

	it('should not computeObject in runOnSingleObject if there is no hooks to execute on updateObject', async () => {
		wabe.config.hooks = []

		const res = await wabe.controllers.database.createObject({
			className: 'User',
			context,
			data: { name: 'Lucas' },
			select: { id: true },
		})

		spyGetObject.mockClear()

		await wabe.controllers.database.updateObject({
			className: 'User',
			context,
			data: { name: 'Lucas' },
			select: { id: true },
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
			select: { id: true },
		})

		spyGetObjects.mockClear()

		await wabe.controllers.database.updateObjects({
			className: 'User',
			context,
			data: { name: 'Lucas' },
			select: { id: true },
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
			select: { id: true },
		})

		spyGetObject.mockClear()

		await wabe.controllers.database.deleteObject({
			className: 'User',
			context,
			select: { id: true },
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
			select: { id: true },
		})

		spyGetObjects.mockClear()

		await wabe.controllers.database.deleteObjects({
			className: 'User',
			context,
			select: { id: true },
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
			select: { age: true },
		})

		expect(res?.age).toEqual(21)

		expect(mockUpdateObject).toHaveBeenCalledTimes(1)
	})

	it('should apply afterRead hook mutations to returned object', async () => {
		wabe.config.hooks = [
			...getDefaultHooks(),
			{
				className: 'User',
				operationType: OperationType.AfterRead,
				priority: 2,
				callback: (hookObject) => {
					// Mutate the object to ensure the returned value is affected by AfterRead
					// @ts-expect-error
					hookObject.object.name = 'mutated-by-after-read'
				},
			},
		]

		const created = await context.wabe.controllers.database.createObject({
			className: 'User',
			context,
			data: { name: 'original-name' },
			select: { id: true },
		})

		const res = await context.wabe.controllers.database.getObject({
			className: 'User',
			context,
			id: created?.id || '',
			select: { id: true, name: true },
		})

		expect(res?.name).toEqual('mutated-by-after-read')
	})

	it('should apply afterRead hook mutations to returned objects list', async () => {
		wabe.config.hooks = [
			...getDefaultHooks(),
			{
				className: 'User',
				operationType: OperationType.AfterRead,
				priority: 2,
				callback: (hookObject) => {
					// @ts-expect-error
					hookObject.object.name = 'mutated-by-after-read-list'
				},
			},
		]

		await context.wabe.controllers.database.createObjects({
			className: 'User',
			context,
			select: { id: true },
			data: [{ name: 'original-name' }],
		})

		const res = await context.wabe.controllers.database.getObjects({
			className: 'User',
			context,
			select: { id: true, name: true },
		})

		expect(res[0]?.name).toEqual('mutated-by-after-read-list')
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
			select: { age: true },
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
			select: {},
		})

		const res = await context.wabe.controllers.database.updateObjects({
			className: 'Test2',
			context,
			select: { name: true },
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
			select: { id: true },
		})

		const res2 = await context.wabe.controllers.database.updateObject({
			className: 'Test2',
			context,
			select: { name: true },
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
               email
               role {
                 id
                 name
               }
            }
        }
      }
    }
    `,
}
