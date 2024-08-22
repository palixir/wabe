import {
	describe,
	it,
	expect,
	mock,
	afterEach,
	spyOn,
	afterAll,
} from 'bun:test'
import { DatabaseController, type WhereType } from '..'
import * as hooks from '../../hooks/index'
import type { WibeContext } from '../../server/interface'

describe('DatabaseController', () => {
	const mockGetObject = mock(() => {})
	const mockGetObjects = mock(() => {})
	const mockCreateObject = mock(() => {})
	const mockCreateObjects = mock(() => {})
	const mockUpdateObject = mock(() => {})
	const mockUpdateObjects = mock(() => {})
	const mockDeleteObject = mock(() => {})
	const mockDeleteObjects = mock(() => {})
	const mockClearDatabase = mock(() => {})
	const mockCount = mock(() => {})

	const mockRunOnSingleObject = mock(() => {})
	const mockRunOnMultipleObject = mock(() => {})

	const mockInitializeHook = spyOn(hooks, 'initializeHook').mockReturnValue({
		runOnSingleObject: mockRunOnSingleObject,
		runOnMultipleObjects: mockRunOnMultipleObject,
	} as never)

	const mockAdapter = mock(() => ({
		getObject: mockGetObject,
		getObjects: mockGetObjects,
		createObject: mockCreateObject,
		createObjects: mockCreateObjects,
		updateObject: mockUpdateObject,
		updateObjects: mockUpdateObjects,
		deleteObject: mockDeleteObject,
		deleteObjects: mockDeleteObjects,
		clearDatabase: mockClearDatabase,
		count: mockCount,
	}))

	const config = {
		schema: {
			classes: [
				{
					name: 'TestClass',
					fields: {
						fieldX: {
							type: 'String',
						},
						pointerToAnotherClass: {
							type: 'Pointer',
							class: 'AnotherClass',
						},
						pointerToAnotherClass2: {
							type: 'Pointer',
							class: 'AnotherClass2',
						},
					},
				},
				{
					name: 'AnotherClass',
					fields: {
						field1: {
							type: 'String',
						},
					},
				},
				{
					name: 'AnotherClass2',
					fields: {
						field3: {
							type: 'String',
						},
					},
				},
				{
					name: 'AnotherClass3',
					fields: {
						field4: {
							type: 'String',
						},
					},
				},
				{
					name: 'AnotherClass4',
					fields: {
						relationToAnotherClass3: {
							type: 'Relation',
							class: 'AnotherClass3',
						},
					},
				},
				{
					name: 'ClassWithObject',
					fields: {
						object: {
							type: 'Object',
							object: {
								name: 'ObjectName',
								fields: {
									objectField: {
										type: 'String',
									},
								},
							},
						},
					},
				},
			],
		},
	} as any

	const context = {
		isRoot: true,
		wibeApp: { config },
		sessionId: 'sessionId',
	} as any

	afterAll(() => {
		mockInitializeHook.mockRestore()
		mockRunOnSingleObject.mockRestore()
		mockRunOnMultipleObject.mockRestore()
	})

	afterEach(() => {
		mockGetObject.mockClear()
		mockGetObjects.mockClear()
		mockInitializeHook.mockClear()
		mockRunOnSingleObject.mockClear()
		mockRunOnMultipleObject.mockClear()
		mockClearDatabase.mockClear()
		mockCount.mockClear()
	})

	it('should call adapter count', async () => {
		const databaseController = new DatabaseController(mockAdapter() as any)

		await databaseController.count({
			className: 'User',
			context,
			where: { age: { equalTo: 20 } },
		})

		expect(mockCount).toHaveBeenCalledTimes(1)
		expect(mockCount).toHaveBeenCalledWith({
			className: 'User',
			context,
			where: { age: { equalTo: 20 } },
		})
	})

	it('should call adapter clearDatabase', async () => {
		const databaseController = new DatabaseController(mockAdapter() as any)

		await databaseController.clearDatabase()

		expect(mockClearDatabase).toHaveBeenCalledTimes(1)
	})

	it('should create new where include the ACL from context when isRoot = true', () => {
		const databaseController = new DatabaseController(mockAdapter() as any)

		const where: WhereType<any, any> = {
			id: { equalTo: 'id' },
		}

		const context: WibeContext<any> = {
			isRoot: true,
			wibeApp: {} as any,
			user: {
				id: 'userId',
				role: {
					id: 'roleId',
				} as any,
			} as any,
		}

		const newWhere = databaseController._buildWhereWithACL(
			where,
			context,
			'read',
		)

		expect(newWhere).toEqual(where)
	})

	it('should create new where include the ACL from context on read operation', () => {
		const databaseController = new DatabaseController(mockAdapter() as any)

		const where: WhereType<any, any> = {
			id: { equalTo: 'id' },
		}

		const context: WibeContext<any> = {
			isRoot: false,
			wibeApp: {} as any,
			user: {
				id: 'userId',
				role: {
					id: 'roleId',
				} as any,
			} as any,
		}

		const newWhere = databaseController._buildWhereWithACL(
			where,
			context,
			'read',
		)

		// Soit user y est donc read doit etre à true soit user y est pas et donc role read doit etre à true

		expect(newWhere).toEqual({
			AND: [
				{ id: { equalTo: 'id' } },
				{
					OR: [
						{
							AND: [
								{
									acl: {
										users: { userId: { in: ['userId'] } },
									},
								},
								{ acl: { users: { read: { in: [true] } } } },
							],
						},
						{
							AND: [
								{
									acl: {
										users: {
											userId: { notIn: ['userId'] },
										},
									},
								},
								{
									acl: {
										roles: { roleId: { in: ['roleId'] } },
									},
								},
								{ acl: { roles: { read: { in: [true] } } } },
							],
						},
					],
				},
			],
		} as any)
	})

	it('should create new where include the ACL from context with undefined roleId', () => {
		const databaseController = new DatabaseController(mockAdapter() as any)

		const where: WhereType<any, any> = {
			id: { equalTo: 'id' },
		}

		const context: WibeContext<any> = {
			isRoot: false,
			wibeApp: {} as any,
			user: {
				id: 'userId',
			} as any,
		}

		const newWhere = databaseController._buildWhereWithACL(
			where,
			context,
			'write',
		)

		expect(newWhere).toEqual({
			AND: [
				{ id: { equalTo: 'id' } },
				{
					OR: [
						{
							AND: [
								{
									acl: {
										users: { userId: { in: ['userId'] } },
									},
								},
								{ acl: { users: { write: { in: [true] } } } },
							],
						},
					],
				},
			],
		} as any)
	})

	it('should create new where include the ACL from context with undefined userId and roleId', () => {
		const databaseController = new DatabaseController(mockAdapter() as any)

		const where: WhereType<any, any> = {
			id: { equalTo: 'id' },
		}

		const context: WibeContext<any> = {
			isRoot: false,
			wibeApp: {} as any,
			user: {} as any,
		}

		const newWhere = databaseController._buildWhereWithACL(
			where,
			context,
			'read',
		)

		expect(newWhere).toEqual({
			AND: [{ id: { equalTo: 'id' } }],
		} as any)
	})

	it('should not call createObjects adapter when the data array is empty', async () => {
		const databaseController = new DatabaseController(mockAdapter() as any)

		await databaseController.createObjects({
			className: 'TestClass',
			context,
			data: [],
			fields: ['*'],
		})

		expect(mockCreateObjects).toHaveBeenCalledTimes(0)
	})

	it('should call hooks on getObject', async () => {
		mockGetObject.mockResolvedValue({} as never)
		const databaseController = new DatabaseController(mockAdapter() as any)

		await databaseController.getObject({
			className: 'TestClass',
			context,
			id: 'id',
			fields: ['id'],
		})

		expect(mockInitializeHook).toHaveBeenCalledTimes(1)
		expect(mockInitializeHook).toHaveBeenCalledWith({
			className: 'TestClass',
			context: {
				sessionId: 'sessionId',
				wibeApp: { config },
				isRoot: true,
			},
		})

		expect(mockRunOnSingleObject).toHaveBeenCalledTimes(2)
		expect(mockRunOnSingleObject).toHaveBeenNthCalledWith(1, {
			operationType: hooks.OperationType.BeforeRead,
			id: 'id',
		})
		expect(mockRunOnSingleObject).toHaveBeenNthCalledWith(2, {
			operationType: hooks.OperationType.AfterRead,
			object: {},
		})
	})

	it('should call hooks on getObjects', async () => {
		mockGetObjects.mockResolvedValue([] as never)

		const databaseController = new DatabaseController(mockAdapter() as any)

		await databaseController.getObjects({
			className: 'TestClass',
			context,
			where: { id: { equalTo: 'id' } },
			fields: ['id'],
		})

		expect(mockInitializeHook).toHaveBeenCalledTimes(1)
		expect(mockInitializeHook).toHaveBeenCalledWith({
			className: 'TestClass',
			context: {
				sessionId: 'sessionId',
				wibeApp: { config },
				isRoot: true,
			},
		})

		expect(mockRunOnMultipleObject).toHaveBeenCalledTimes(2)
		expect(mockRunOnMultipleObject).toHaveBeenNthCalledWith(1, {
			operationType: hooks.OperationType.BeforeRead,
			where: { id: { equalTo: 'id' } },
		})
		expect(mockRunOnMultipleObject).toHaveBeenNthCalledWith(2, {
			operationType: hooks.OperationType.AfterRead,
			objects: [],
		})
	})

	it('should call hooks on updateObject', async () => {
		mockRunOnSingleObject.mockResolvedValue({
			object: undefined,
		} as never)
		mockUpdateObject.mockResolvedValue({ id: 'id' } as never)
		mockGetObject.mockResolvedValue({ id: 'id' } as never)

		const databaseController = new DatabaseController(mockAdapter() as any)

		await databaseController.updateObject({
			className: 'TestClass',
			context,
			id: 'id',
			data: { name: 'test' },
			fields: ['id'],
		})

		expect(mockInitializeHook).toHaveBeenCalledTimes(1)
		expect(mockInitializeHook).toHaveBeenCalledWith({
			className: 'TestClass',
			context: {
				sessionId: 'sessionId',
				wibeApp: { config },
				isRoot: true,
			},
			newData: { name: 'test' },
		})

		expect(mockRunOnSingleObject).toHaveBeenCalledTimes(2)
		expect(mockRunOnSingleObject).toHaveBeenNthCalledWith(1, {
			operationType: hooks.OperationType.BeforeUpdate,
			id: 'id',
		})
		expect(mockRunOnSingleObject).toHaveBeenNthCalledWith(2, {
			operationType: hooks.OperationType.AfterUpdate,
			object: { id: 'id' },
		})
	})

	it('should call hooks on updateObjects', async () => {
		mockRunOnMultipleObject.mockResolvedValue({
			newData: {},
			objects: [],
		} as never)
		mockUpdateObjects.mockResolvedValue([] as never)

		const databaseController = new DatabaseController(mockAdapter() as any)

		await databaseController.updateObjects({
			className: 'TestClass',
			context,
			where: { id: { equalTo: 'id' } },
			data: { name: 'test' },
			fields: ['id'],
		})

		expect(mockInitializeHook).toHaveBeenCalledTimes(1)
		expect(mockInitializeHook).toHaveBeenCalledWith({
			className: 'TestClass',
			context: {
				sessionId: 'sessionId',
				wibeApp: { config },
				isRoot: true,
			},
			newData: { name: 'test' },
		})

		expect(mockRunOnMultipleObject).toHaveBeenCalledTimes(2)
		expect(mockRunOnMultipleObject).toHaveBeenNthCalledWith(1, {
			operationType: hooks.OperationType.BeforeUpdate,
			where: { id: { equalTo: 'id' } },
		})
		expect(mockRunOnMultipleObject).toHaveBeenNthCalledWith(2, {
			operationType: hooks.OperationType.AfterUpdate,
			objects: [],
		})
	})

	it('should call hooks on createObject', async () => {
		mockCreateObject.mockResolvedValue({ id: 'id' } as never)

		const databaseController = new DatabaseController(mockAdapter() as any)

		await databaseController.createObject({
			className: 'TestClass',
			context,
			data: { name: 'test' },
			fields: ['id'],
		})

		expect(mockInitializeHook).toHaveBeenCalledTimes(1)
		expect(mockInitializeHook).toHaveBeenCalledWith({
			className: 'TestClass',
			context: {
				sessionId: 'sessionId',
				wibeApp: { config },
				isRoot: true,
			},
			newData: { name: 'test' },
		})

		expect(mockRunOnSingleObject).toHaveBeenCalledTimes(2)
		expect(mockRunOnSingleObject).toHaveBeenNthCalledWith(1, {
			operationType: hooks.OperationType.BeforeCreate,
		})
		expect(mockRunOnSingleObject).toHaveBeenNthCalledWith(2, {
			operationType: hooks.OperationType.AfterCreate,
			object: {
				id: 'id',
			},
		})
	})

	it('should call hooks on createObjects', async () => {
		mockGetObjects.mockResolvedValue([{ id: 'id' }] as never)
		mockCreateObjects.mockResolvedValue([{ id: 'id' }] as never)
		mockRunOnMultipleObject.mockResolvedValue({
			objects: [],
			newData: [{ name: 'test' }],
		} as never)

		const databaseController = new DatabaseController(mockAdapter() as any)

		await databaseController.createObjects({
			className: 'TestClass',
			context,
			data: [{ name: 'test' }],
			fields: ['id'],
		})

		expect(mockInitializeHook).toHaveBeenCalledTimes(1)
		expect(mockInitializeHook).toHaveBeenCalledWith({
			className: 'TestClass',
			context: {
				sessionId: 'sessionId',
				wibeApp: { config },
				isRoot: true,
			},
			newData: { name: 'test' },
		})

		expect(mockRunOnMultipleObject).toHaveBeenCalledTimes(2)
		expect(mockRunOnMultipleObject).toHaveBeenNthCalledWith(1, {
			operationType: hooks.OperationType.BeforeCreate,
		})
		expect(mockRunOnMultipleObject).toHaveBeenNthCalledWith(2, {
			operationType: hooks.OperationType.AfterCreate,
			objects: [{ id: 'id' }],
		})

		mockRunOnMultipleObject.mockClear()
	})

	it('should call hooks on deleteObject', async () => {
		const databaseController = new DatabaseController(mockAdapter() as any)

		await databaseController.deleteObject({
			className: 'TestClass',
			context,
			fields: ['id'],
			id: 'id',
		})

		expect(mockInitializeHook).toHaveBeenCalledTimes(2)
		expect(mockInitializeHook).toHaveBeenCalledWith({
			className: 'TestClass',
			context: {
				sessionId: 'sessionId',
				wibeApp: { config },
				isRoot: true,
			},
		})

		// 4 because we have a getObject before the delete
		expect(mockRunOnSingleObject).toHaveBeenCalledTimes(4)
		expect(mockRunOnSingleObject).toHaveBeenNthCalledWith(3, {
			operationType: hooks.OperationType.BeforeDelete,
			id: 'id',
		})
		expect(mockRunOnSingleObject).toHaveBeenNthCalledWith(4, {
			operationType: hooks.OperationType.AfterDelete,
			object: undefined, // Because we don't mock deleteObject in databaseController
		})
	})

	it('should call hooks on deleteObjects', async () => {
		mockGetObjects.mockResolvedValue([{ id: 'id' }] as never)
		mockRunOnMultipleObject.mockResolvedValue({} as never)

		const databaseController = new DatabaseController(mockAdapter() as any)

		await databaseController.deleteObjects({
			className: 'TestClass',
			context,
			where: { id: { equalTo: 'id' } },
			fields: ['id'],
		})

		expect(mockInitializeHook).toHaveBeenCalledTimes(2)
		expect(mockInitializeHook).toHaveBeenCalledWith({
			className: 'TestClass',
			context: {
				sessionId: 'sessionId',
				wibeApp: { config },
				isRoot: true,
			},
		})

		// 4 because we have a getObject before the delete
		expect(mockRunOnMultipleObject).toHaveBeenCalledTimes(4)
		expect(mockRunOnMultipleObject).toHaveBeenNthCalledWith(3, {
			operationType: hooks.OperationType.BeforeDelete,
			where: { id: { equalTo: 'id' } },
		})
		expect(mockRunOnMultipleObject).toHaveBeenNthCalledWith(4, {
			operationType: hooks.OperationType.AfterDelete,
		})

		mockRunOnMultipleObject.mockClear()
	})
})
