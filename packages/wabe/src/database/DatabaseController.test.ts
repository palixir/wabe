import {
	describe,
	it,
	expect,
	mock,
	afterEach,
	spyOn,
	afterAll,
} from 'bun:test'
import type { WhereType } from '.'
import * as hooks from '../hooks/index'
import type { WabeContext } from '../server/interface'
import type { DevWabeTypes } from '../utils/helper'
import { DatabaseController } from './DatabaseController'

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

	const mockRunOnSingleObject = mock(() => ({ newData: {} }) as never)
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
		wabe: { config },
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

		const context: WabeContext<any> = {
			isRoot: true,
			wabe: {} as any,
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

		const where: WhereType<DevWabeTypes, any> = {
			id: { equalTo: 'id' },
		}

		const context: WabeContext<any> = {
			isRoot: false,
			wabe: {} as any,
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
							acl: { equalTo: null },
						},
						{
							acl: {
								users: { contains: { userId: 'userId', read: true } },
							},
						},
						{
							AND: [
								{
									acl: {
										users: {
											notContains: { userId: 'userId' },
										},
									},
								},
								{
									acl: {
										roles: { contains: { roleId: 'roleId', read: true } },
									},
								},
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

		const context: WabeContext<any> = {
			isRoot: false,
			wabe: {} as any,
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
							acl: { equalTo: null },
						},
						{
							acl: {
								users: { contains: { userId: 'userId', write: true } },
							},
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

		const context: WabeContext<any> = {
			isRoot: false,
			wabe: {} as any,
			user: {} as any,
		}

		const newWhere = databaseController._buildWhereWithACL(
			where,
			context,
			'read',
		)

		expect(newWhere).toEqual({
			AND: [{ id: { equalTo: 'id' } }, { acl: { equalTo: null } }],
		} as any)
	})

	it('should not call createObjects adapter when the data array is empty', async () => {
		const databaseController = new DatabaseController(mockAdapter() as any)

		await databaseController.createObjects({
			className: 'TestClass',
			context,
			data: [],
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
			select: { id: true },
		})

		expect(mockInitializeHook).toHaveBeenCalledTimes(1)
		expect(mockInitializeHook).toHaveBeenCalledWith({
			className: 'TestClass',
			context: {
				sessionId: 'sessionId',
				wabe: { config },
				isRoot: true,
			},
			select: { id: true },
		})

		expect(mockRunOnSingleObject).toHaveBeenCalledTimes(2)
		expect(mockRunOnSingleObject).toHaveBeenNthCalledWith(1, {
			operationType: hooks.OperationType.BeforeRead,
			id: 'id',
		})
		expect(mockRunOnSingleObject).toHaveBeenNthCalledWith(2, {
			operationType: hooks.OperationType.AfterRead,
			id: 'id',
		})
	})

	it('should call hooks on getObjects', async () => {
		mockGetObjects.mockResolvedValue([] as never)

		const databaseController = new DatabaseController(mockAdapter() as any)

		await databaseController.getObjects({
			className: 'TestClass',
			context,
			where: { id: { equalTo: 'id' } },
			select: { id: true },
		})

		expect(mockInitializeHook).toHaveBeenCalledTimes(1)
		expect(mockInitializeHook).toHaveBeenCalledWith({
			className: 'TestClass',
			context: {
				sessionId: 'sessionId',
				wabe: { config },
				isRoot: true,
			},
			select: { id: true },
		})

		expect(mockRunOnMultipleObject).toHaveBeenCalledTimes(2)
		expect(mockRunOnMultipleObject).toHaveBeenNthCalledWith(1, {
			operationType: hooks.OperationType.BeforeRead,
			where: { id: { equalTo: 'id' } },
		})
		expect(mockRunOnMultipleObject).toHaveBeenNthCalledWith(2, {
			operationType: hooks.OperationType.AfterRead,
			where: { id: { equalTo: 'id' } },
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
			select: { id: true },
		})

		expect(mockInitializeHook).toHaveBeenCalledTimes(2)
		expect(mockInitializeHook).toHaveBeenCalledWith({
			className: 'TestClass',
			context: {
				sessionId: 'sessionId',
				wabe: { config },
				isRoot: true,
			},
			newData: { name: 'test' },
			select: { id: true },
		})

		expect(mockRunOnSingleObject).toHaveBeenCalledTimes(4)
		expect(mockRunOnSingleObject).toHaveBeenNthCalledWith(1, {
			operationType: hooks.OperationType.BeforeUpdate,
			id: 'id',
		})
		expect(mockRunOnSingleObject).toHaveBeenNthCalledWith(2, {
			operationType: hooks.OperationType.AfterUpdate,
			id: 'id',
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
			select: { id: true },
		})

		expect(mockInitializeHook).toHaveBeenCalledTimes(2)
		expect(mockInitializeHook).toHaveBeenCalledWith({
			className: 'TestClass',
			context: {
				sessionId: 'sessionId',
				wabe: { config },
				isRoot: true,
			},
			newData: { name: 'test' },
			select: { id: true },
		})

		expect(mockRunOnMultipleObject).toHaveBeenCalledTimes(4)
		expect(mockRunOnMultipleObject).toHaveBeenNthCalledWith(1, {
			operationType: hooks.OperationType.BeforeUpdate,
			where: { id: { equalTo: 'id' } },
		})
		expect(mockRunOnMultipleObject).toHaveBeenNthCalledWith(2, {
			operationType: hooks.OperationType.AfterUpdate,
			ids: [],
			originalObjects: [],
		})
	})

	it('should call hooks on createObject', async () => {
		mockCreateObject.mockResolvedValue({ id: 'id' } as never)

		const databaseController = new DatabaseController(mockAdapter() as any)

		await databaseController.createObject({
			className: 'TestClass',
			context,
			data: { name: 'test' },
			select: { id: true },
		})

		expect(mockInitializeHook).toHaveBeenCalledTimes(2)
		expect(mockInitializeHook).toHaveBeenCalledWith({
			className: 'TestClass',
			context: {
				sessionId: 'sessionId',
				wabe: { config },
				isRoot: true,
			},
			newData: { name: 'test' },
			select: { id: true },
		})

		expect(mockRunOnSingleObject).toHaveBeenCalledTimes(4)
		expect(mockRunOnSingleObject).toHaveBeenNthCalledWith(1, {
			operationType: hooks.OperationType.BeforeCreate,
		})
		expect(mockRunOnSingleObject).toHaveBeenNthCalledWith(2, {
			operationType: hooks.OperationType.AfterCreate,
			id: 'id',
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
			select: { id: true },
		})

		expect(mockInitializeHook).toHaveBeenCalledTimes(2)
		expect(mockInitializeHook).toHaveBeenCalledWith({
			className: 'TestClass',
			context: {
				sessionId: 'sessionId',
				wabe: { config },
				isRoot: true,
			},
			newData: { name: 'test' },
			select: { id: true },
		})

		expect(mockRunOnMultipleObject).toHaveBeenCalledTimes(4)
		expect(mockRunOnMultipleObject).toHaveBeenNthCalledWith(1, {
			operationType: hooks.OperationType.BeforeCreate,
		})
		expect(mockRunOnMultipleObject).toHaveBeenNthCalledWith(2, {
			operationType: hooks.OperationType.AfterCreate,
			ids: ['id'],
		})

		mockRunOnMultipleObject.mockClear()
	})

	it('should call hooks on deleteObject', async () => {
		const databaseController = new DatabaseController(mockAdapter() as any)

		await databaseController.deleteObject({
			className: 'TestClass',
			context,
			select: { id: true },
			id: 'id',
		})

		expect(mockInitializeHook).toHaveBeenCalledTimes(2)
		expect(mockInitializeHook).toHaveBeenCalledWith({
			className: 'TestClass',
			context: {
				sessionId: 'sessionId',
				wabe: { config },
				isRoot: true,
			},
			select: { id: true },
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
			select: { id: true },
		})

		expect(mockInitializeHook).toHaveBeenCalledTimes(2)
		expect(mockInitializeHook).toHaveBeenCalledWith({
			className: 'TestClass',
			context: {
				sessionId: 'sessionId',
				wabe: { config },
				isRoot: true,
			},
			select: { id: true },
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
