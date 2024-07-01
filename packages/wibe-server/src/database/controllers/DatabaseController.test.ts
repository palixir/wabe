import {
	describe,
	it,
	expect,
	mock,
	afterEach,
	spyOn,
	afterAll,
} from 'bun:test'
import { DatabaseController } from '..'
import * as hooks from '../../hooks/index'

describe('DatabaseController', () => {
	const mockGetObject = mock(() => {})
	const mockGetObjects = mock(() => {})
	const mockCreateObject = mock(() => {})
	const mockCreateObjects = mock(() => {})
	const mockUpdateObject = mock(() => {})
	const mockUpdateObjects = mock(() => {})
	const mockDeleteObject = mock(() => {})
	const mockDeleteObjects = mock(() => {})

	const mockHookRun = mock(() => {})

	const mockInitializeHook = spyOn(hooks, 'initializeHook').mockResolvedValue(
		{
			run: mockHookRun,
		} as any,
	)

	const mockAdapter = mock(() => ({
		getObject: mockGetObject,
		getObjects: mockGetObjects,
		createObject: mockCreateObject,
		createObjects: mockCreateObjects,
		updateObject: mockUpdateObject,
		updateObjects: mockUpdateObjects,
		deleteObject: mockDeleteObject,
		deleteObjects: mockDeleteObjects,
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
			],
		},
	} as any

	const context = {
		isRoot: true,
		config,
		sessionId: 'sessionId',
	} as any

	afterAll(() => {
		mockInitializeHook.mockRestore()
		mockHookRun.mockRestore()
	})

	afterEach(() => {
		mockGetObject.mockClear()
		mockGetObjects.mockClear()
		mockInitializeHook.mockClear()
		mockHookRun.mockClear()
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

	it('should call findHooksAndExecute on getObject', async () => {
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
				config,
				isRoot: true,
			},
			newData: null,
			id: 'id',
		})

		expect(mockHookRun).toHaveBeenCalledTimes(2)
		expect(mockHookRun).toHaveBeenNthCalledWith(
			1,
			hooks.OperationType.BeforeRead,
		)
		expect(mockHookRun).toHaveBeenNthCalledWith(
			2,
			hooks.OperationType.AfterRead,
		)
	})

	it('should call findHooksAndExecute on getObjects', async () => {
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
			context: { sessionId: 'sessionId', config, isRoot: true },
			newData: null,
			where: { id: { equalTo: 'id' } },
		})

		expect(mockHookRun).toHaveBeenCalledTimes(2)
		expect(mockHookRun).toHaveBeenNthCalledWith(
			1,
			hooks.OperationType.BeforeRead,
		)
		expect(mockHookRun).toHaveBeenNthCalledWith(
			2,
			hooks.OperationType.AfterRead,
		)
	})

	it('should call findHooksAndExecute on updateObject', async () => {
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
			context: { sessionId: 'sessionId', config, isRoot: true },
			newData: { name: 'test' },
			id: 'id',
		})

		expect(mockHookRun).toHaveBeenCalledTimes(2)
		expect(mockHookRun).toHaveBeenNthCalledWith(
			1,
			hooks.OperationType.BeforeUpdate,
		)
		expect(mockHookRun).toHaveBeenNthCalledWith(
			2,
			hooks.OperationType.AfterUpdate,
		)
	})

	it('should call findHooksAndExecute on updateObjects', async () => {
		mockGetObjects.mockResolvedValue([] as never)

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
			context: { sessionId: 'sessionId', config, isRoot: true },
			newData: { name: 'test' },
			where: { id: { equalTo: 'id' } },
		})

		expect(mockHookRun).toHaveBeenCalledTimes(2)
		expect(mockHookRun).toHaveBeenNthCalledWith(
			1,
			hooks.OperationType.BeforeUpdate,
		)
		expect(mockHookRun).toHaveBeenNthCalledWith(
			2,
			hooks.OperationType.AfterUpdate,
		)
	})

	it('should call findHooksAndExecute on createObject', async () => {
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
			context: { sessionId: 'sessionId', config, isRoot: true },
			newData: { name: 'test' },
		})

		expect(mockHookRun).toHaveBeenCalledTimes(2)
		expect(mockHookRun).toHaveBeenNthCalledWith(
			1,
			hooks.OperationType.BeforeCreate,
		)
		expect(mockHookRun).toHaveBeenNthCalledWith(
			2,
			hooks.OperationType.AfterCreate,
		)
	})

	it('should call findHooksAndExecute on createObjects', async () => {
		mockGetObjects.mockResolvedValue([] as never)

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
			context: { sessionId: 'sessionId', config, isRoot: true },
			newData: { name: 'test' },
		})

		expect(mockHookRun).toHaveBeenCalledTimes(2)
		expect(mockHookRun).toHaveBeenNthCalledWith(
			1,
			hooks.OperationType.BeforeCreate,
		)
		expect(mockHookRun).toHaveBeenNthCalledWith(
			2,
			hooks.OperationType.AfterCreate,
		)
	})

	it('should call findHooksAndExecute on deleteObject', async () => {
		mockGetObject.mockResolvedValue({ name: 'test' } as never)

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
			context: { sessionId: 'sessionId', config, isRoot: true },
			newData: null,
			id: 'id',
		})

		// 4 because we have a getObject before the delete
		expect(mockHookRun).toHaveBeenCalledTimes(4)
		expect(mockHookRun).toHaveBeenNthCalledWith(
			3,
			hooks.OperationType.BeforeDelete,
		)
		expect(mockHookRun).toHaveBeenNthCalledWith(
			4,
			hooks.OperationType.AfterDelete,
		)
	})

	it('should call findHooksAndExecute on deleteObjects', async () => {
		mockGetObjects.mockResolvedValue([{ name: 'test' }] as never)

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
			context: { sessionId: 'sessionId', config, isRoot: true },
			newData: null,
			where: { id: { equalTo: 'id' } },
		})

		// 4 because we have a getObject before the delete
		expect(mockHookRun).toHaveBeenCalledTimes(4)
		expect(mockHookRun).toHaveBeenNthCalledWith(
			3,
			hooks.OperationType.BeforeDelete,
		)
		expect(mockHookRun).toHaveBeenNthCalledWith(
			4,
			hooks.OperationType.AfterDelete,
		)
	})

	it("should get where object on complex structure (AND or OR) when try to get object from pointer's class", async () => {
		mockGetObjects.mockResolvedValueOnce([
			{ id: 'anotherClassId' },
			{ id: 'anotherClassId2' },
		] as never)

		const databaseController = new DatabaseController(mockAdapter() as any)

		const res =
			await databaseController._getWhereObjectWithPointerOrRelation(
				'TestClass',
				{
					AND: [
						{
							pointerToAnotherClass: {
								field1: { equalTo: 'value' },
							},
						},
						{
							fieldX: { equalTo: 'value' },
						},
					],
				},
				context,
			)

		expect(res).toEqual({
			AND: [
				{
					pointerToAnotherClass: {
						in: ['anotherClassId', 'anotherClassId2'],
					},
				},
				{
					fieldX: { equalTo: 'value' },
				},
			],
		})
	})

	it("should get where object when try to get object from pointer's class", async () => {
		mockGetObjects.mockResolvedValueOnce([
			{ id: 'anotherClassId' },
			{ id: 'anotherClassId2' },
		] as never)

		const databaseController = new DatabaseController(mockAdapter() as any)

		const res =
			await databaseController._getWhereObjectWithPointerOrRelation(
				'TestClass',
				{
					pointerToAnotherClass: { field1: { equalTo: 'value' } },
				},
				context,
			)

		expect(res).toEqual({
			pointerToAnotherClass: {
				in: ['anotherClassId', 'anotherClassId2'],
			},
		})
	})

	it('should get multiple objects with pointer data', async () => {
		mockGetObjects.mockResolvedValueOnce([
			{ id: 'anotherClassId' },
			{ id: 'anotherClassId2' },
		] as never)

		mockGetObjects.mockResolvedValueOnce([
			{ id: 'anotherClassId' },
			{ id: 'anotherClassId2' },
		] as never)

		const databaseController = new DatabaseController(mockAdapter() as any)

		await databaseController.getObjects({
			className: 'TestClass',
			where: {
				// @ts-expect-error
				pointerToAnotherClass: { field1: { equalTo: 'value' } },
			},
			fields: ['id'],
			context,
		})

		// One time for the call above and one to get all objects of the pointer class
		expect(mockGetObjects).toHaveBeenCalledTimes(2)
		expect(mockGetObjects).toHaveBeenNthCalledWith(1, {
			className: 'AnotherClass',
			where: { field1: { equalTo: 'value' } },
			fields: ['id'],
			context,
		})
	})

	it('should return id on pointer type if no sub field specified', async () => {
		mockGetObject.mockResolvedValueOnce({
			id: '123',
			pointerToAnotherClass: 'pointerAnotherClassId',
		} as never)

		const databaseController = new DatabaseController(mockAdapter() as any)

		const res = await databaseController.getObject({
			className: 'TestClass',
			id: '123',
			fields: ['pointerToAnotherClass'],
			context,
		})

		expect(res).toEqual({
			id: '123',
			pointerToAnotherClass: 'pointerAnotherClassId',
		})
	})

	it('should return true if there is at least one relation field (_isRelationField)', () => {
		const databaseController = new DatabaseController(mockAdapter() as any)

		expect(
			databaseController._isRelationField(
				'AnotherClass4',
				'AnotherClass3',
				context,
			),
		).toBe(true)
	})

	it('should return false if the field is not Pointer of the class', () => {
		const databaseController = new DatabaseController(mockAdapter() as any)

		expect(
			databaseController._isRelationField(
				'AnotherClass3' as any,
				'AnotherClass4',
				context,
			),
		).toBe(false)
	})

	it('should getObject with one relation field', async () => {
		mockGetObject.mockResolvedValueOnce({
			id: '123',
			relationToAnotherClass3: ['anotherClass3Id'],
		} as never)

		mockGetObjects.mockResolvedValueOnce([
			{
				id: 'anotherClass3Id',
				name: 'anotherClass3Name',
			},
		] as never)

		const databaseController = new DatabaseController(mockAdapter() as any)

		const res = await databaseController.getObject({
			className: 'AnotherClass4',
			id: '123',
			fields: [
				'id',
				'relationToAnotherClass3.id',
				'relationToAnotherClass3.field4',
			],
			context,
		})

		expect(res).toEqual({
			id: '123',
			// @ts-expect-error
			relationToAnotherClass3: {
				edges: [
					{
						node: {
							id: 'anotherClass3Id',
							name: 'anotherClass3Name',
						},
					},
				],
			},
		})

		expect(mockGetObject).toHaveBeenCalledTimes(1)
		expect(mockGetObject).toHaveBeenCalledWith({
			className: 'AnotherClass4',
			id: '123',
			fields: ['id', 'relationToAnotherClass3'],
			context,
		})

		expect(mockGetObjects).toHaveBeenCalledTimes(1)
		expect(mockGetObjects).toHaveBeenCalledWith({
			className: 'AnotherClass3',
			where: { id: { in: ['anotherClass3Id'] } },
			fields: ['id', 'field4'],
			context,
		})
	})

	it('should getObjects with one relation field', async () => {
		mockGetObjects.mockResolvedValueOnce([
			{
				id: '123',
				relationToAnotherClass3: ['anotherClass3Id'],
			},
		] as never)

		mockGetObjects.mockResolvedValueOnce([
			{
				id: 'anotherClass3Id',
				name: 'anotherClass3Name',
			},
		] as never)

		const databaseController = new DatabaseController(mockAdapter() as any)

		const res = await databaseController.getObjects({
			className: 'AnotherClass4',
			where: { id: { equalTo: '123' } },
			fields: [
				'id',
				'relationToAnotherClass3.id',
				'relationToAnotherClass3.field4',
			],
			context,
		})

		expect(res).toEqual([
			{
				id: '123',
				// @ts-expect-error
				relationToAnotherClass3: {
					edges: [
						{
							node: {
								id: 'anotherClass3Id',
								name: 'anotherClass3Name',
							},
						},
					],
				},
			},
		])

		expect(mockGetObjects).toHaveBeenCalledTimes(2)
		expect(mockGetObjects).toHaveBeenNthCalledWith(1, {
			className: 'AnotherClass4',
			where: { id: { equalTo: '123' } },
			fields: ['id', 'relationToAnotherClass3'],
			context,
		})
		expect(mockGetObjects).toHaveBeenNthCalledWith(2, {
			className: 'AnotherClass3',
			where: { id: { in: ['anotherClass3Id'] } },
			fields: ['id', 'field4'],
			context,
		})
	})

	it('should get the object with pointer data', async () => {
		const databaseController = new DatabaseController(mockAdapter() as any)

		spyOn(databaseController, '_isPointerField').mockReturnValueOnce(true)

		await databaseController._getFinalObjectWithPointer(
			{
				name: 'name',
				pointerToAnotherClass: 'idOfAnotherClass',
			},
			{
				pointerToAnotherClass: {
					fieldsOfPointerClass: ['field1'],
					pointerClass: 'AnotherClass',
				},
			},
			'TestClass',
			context,
		)

		expect(mockGetObject).toHaveBeenCalledTimes(1)
		expect(mockGetObject).toHaveBeenCalledWith({
			className: 'AnotherClass',
			fields: ['field1'],
			id: 'idOfAnotherClass',
			context,
		})
	})

	it('should return true if the field is a Pointer of the class', () => {
		const databaseController = new DatabaseController(mockAdapter() as any)

		expect(
			databaseController._isPointerField(
				'testClass' as any,
				'anotherClass',
				context,
			),
		).toBe(true)
	})

	it('should return false if the field is not Pointer of the class', () => {
		const databaseController = new DatabaseController(mockAdapter() as any)

		expect(
			databaseController._isPointerField(
				'anotherClass' as any,
				'anotherClass2',
				context,
			),
		).toBe(false)
	})

	it('should return false if the field is not Pointer of the class (class not exist)', () => {
		const databaseController = new DatabaseController(mockAdapter() as any)

		expect(
			databaseController._isPointerField(
				'invalidClass' as any,
				'anotherClass2',
				context,
			),
		).toBe(false)
	})

	it("should get all pointer's classes to request", () => {
		const databaseController = new DatabaseController(mockAdapter() as any)

		const fields = [
			'name',
			'pointerToAnotherClass.field1',
			'pointerToAnotherClass.field2',
		]

		expect(
			databaseController._getPointerObject('TestClass', fields, context),
		).toEqual({
			pointers: {
				pointerToAnotherClass: {
					pointerClass: 'AnotherClass',
					fieldsOfPointerClass: ['field1', 'field2'],
				},
			},
			pointersFieldsId: ['pointerToAnotherClass'],
		})
	})

	it("should get all pointer's classes to request with multiple pointer", () => {
		const databaseController = new DatabaseController(mockAdapter() as any)

		const fields = [
			'name',
			'pointerToAnotherClass.field1',
			'pointerToAnotherClass.field2',
			'pointerToAnotherClass2.field3',
		]

		expect(
			databaseController._getPointerObject('TestClass', fields, context),
		).toEqual({
			pointers: {
				pointerToAnotherClass: {
					pointerClass: 'AnotherClass',
					fieldsOfPointerClass: ['field1', 'field2'],
				},
				pointerToAnotherClass2: {
					pointerClass: 'AnotherClass2',
					fieldsOfPointerClass: ['field3'],
				},
			},
			pointersFieldsId: [
				'pointerToAnotherClass',
				'pointerToAnotherClass2',
			],
		})
	})

	it('shoud getObject with no fields in output', async () => {
		mockGetObject.mockResolvedValueOnce({
			id: '123',
			name: 'name',
		} as never)

		const databaseController = new DatabaseController(mockAdapter() as any)

		await databaseController.getObject({
			className: 'TestClass',
			id: '123',
			context,
		})

		expect(mockGetObject).toHaveBeenCalledTimes(1)
		expect(mockGetObject).toHaveBeenNthCalledWith(1, {
			className: 'TestClass',
			id: '123',
			fields: [],
			context,
		})
	})

	it('should getObject without pointer', async () => {
		mockGetObject.mockResolvedValueOnce({
			id: '123',
			name: 'name',
		} as never)

		const databaseController = new DatabaseController(mockAdapter() as any)

		const res = await databaseController.getObject({
			className: 'TestClass',
			id: '123',
			fields: ['id', 'name'],
			context,
		})

		expect(res).toEqual({
			id: '123',
			name: 'name',
		})

		expect(mockGetObject).toHaveBeenCalledTimes(1)
		expect(mockGetObject).toHaveBeenNthCalledWith(1, {
			className: 'TestClass',
			id: '123',
			fields: ['id', 'name'],
			context,
		})
	})

	it('should call the getObject on adapter with one pointer', async () => {
		mockGetObject.mockResolvedValueOnce({
			id: '123',
			pointerToAnotherClass: 'anotherClassId',
		} as never)

		mockGetObject.mockResolvedValueOnce({
			id: 'anotherClassId',
			name: 'anotherClassName',
		} as never)

		const databaseController = new DatabaseController(mockAdapter() as any)

		const res = await databaseController.getObject({
			className: 'TestClass',
			id: '123',
			fields: [
				'id',
				'name',
				'pointerToAnotherClass.id',
				'pointerToAnotherClass.name',
			],
			context,
		})

		expect(res).toEqual({
			id: '123',
			// @ts-expect-error
			pointerToAnotherClass: {
				id: 'anotherClassId',
				name: 'anotherClassName',
			},
		})

		expect(mockGetObject).toHaveBeenCalledTimes(2)
		expect(mockGetObject).toHaveBeenNthCalledWith(1, {
			className: 'TestClass',
			id: '123',
			fields: ['id', 'name', 'pointerToAnotherClass'],
			context,
		})

		expect(mockGetObject).toHaveBeenNthCalledWith(2, {
			className: 'AnotherClass',
			id: 'anotherClassId',
			fields: ['id', 'name'],
			context,
		})
	})

	it('should call getObject with multiple pointers', async () => {
		mockGetObject.mockResolvedValueOnce({
			id: '123',
			pointerToAnotherClass: 'anotherClassId',
			pointerToAnotherClass2: 'anotherClass2Id',
		} as never)

		mockGetObject.mockResolvedValueOnce({
			id: 'anotherClassId',
			name: 'anotherClassName',
		} as never)

		mockGetObject.mockResolvedValueOnce({
			age: 'anotherClass2Age',
		} as never)

		const databaseController = new DatabaseController(mockAdapter() as any)

		const res = await databaseController.getObject({
			className: 'TestClass',
			id: '123',
			fields: [
				'id',
				'name',
				'pointerToAnotherClass.id',
				'pointerToAnotherClass.name',
				'pointerToAnotherClass2.age',
			],
			context,
		})

		expect(res).toEqual({
			id: '123',
			// @ts-expect-error
			pointerToAnotherClass: {
				id: 'anotherClassId',
				name: 'anotherClassName',
			},
			pointerToAnotherClass2: {
				age: 'anotherClass2Age',
			},
		})

		expect(mockGetObject).toHaveBeenCalledTimes(3)
		expect(mockGetObject).toHaveBeenNthCalledWith(1, {
			className: 'TestClass',
			id: '123',
			fields: [
				'id',
				'name',
				'pointerToAnotherClass',
				'pointerToAnotherClass2',
			],
			context,
		})

		expect(mockGetObject).toHaveBeenNthCalledWith(2, {
			className: 'AnotherClass',
			id: 'anotherClassId',
			fields: ['id', 'name'],
			context,
		})

		expect(mockGetObject).toHaveBeenNthCalledWith(3, {
			className: 'AnotherClass2',
			id: 'anotherClass2Id',
			fields: ['age'],
			context,
		})
	})

	it('shoud getObjects with no fields in output', async () => {
		mockGetObjects.mockResolvedValueOnce([
			{
				id: '123',
			},
		] as never)

		const databaseController = new DatabaseController(mockAdapter() as any)

		await databaseController.getObjects({
			className: 'TestClass',
			where: {
				id: {
					equalTo: '123',
				},
			},
			context,
		})

		expect(mockGetObjects).toHaveBeenCalledTimes(1)
		expect(mockGetObjects).toHaveBeenNthCalledWith(1, {
			className: 'TestClass',
			where: {
				id: { equalTo: '123' },
			},
			fields: [],
			context,
		})
	})

	it('should call getObjects with no pointer', async () => {
		mockGetObjects.mockResolvedValueOnce([
			{
				id: '123',
				name: 'name',
			},
		] as never)

		const databaseController = new DatabaseController(mockAdapter() as any)

		const res = await databaseController.getObjects({
			className: 'TestClass',
			where: {
				id: { equalTo: '123' },
			},
			fields: ['name'],
			context,
		})

		expect(res).toEqual([
			{
				id: '123',
				name: 'name',
			},
		])

		expect(mockGetObject).toHaveBeenCalledTimes(0)

		expect(mockGetObjects).toHaveBeenCalledTimes(1)
		expect(mockGetObjects).toHaveBeenNthCalledWith(1, {
			className: 'TestClass',
			where: {
				id: { equalTo: '123' },
			},
			fields: ['name'],
			context,
		})
	})

	it('should call getObjects with one pointer', async () => {
		mockGetObjects.mockResolvedValueOnce([
			{
				id: '123',
				pointerToAnotherClass: 'anotherClassId',
			},
		] as never)

		mockGetObject.mockResolvedValueOnce({
			id: 'anotherClassId',
			name: 'anotherClassName',
		} as never)

		const databaseController = new DatabaseController(mockAdapter() as any)

		const res = await databaseController.getObjects({
			className: 'TestClass',
			where: {
				id: {
					equalTo: '123',
				},
			},
			fields: [
				'name',
				'pointerToAnotherClass.id',
				'pointerToAnotherClass.name',
			],
			context,
		})

		expect(res).toEqual([
			{
				id: '123',
				pointerToAnotherClass: {
					id: 'anotherClassId',
					name: 'anotherClassName',
				},
			},
		])

		expect(mockGetObject).toHaveBeenCalledTimes(1)
		expect(mockGetObject).toHaveBeenNthCalledWith(1, {
			className: 'AnotherClass',
			id: 'anotherClassId',
			fields: ['id', 'name'],
			context,
		})

		expect(mockGetObjects).toHaveBeenCalledTimes(1)
		expect(mockGetObjects).toHaveBeenNthCalledWith(1, {
			className: 'TestClass',
			where: {
				id: {
					equalTo: '123',
				},
			},
			fields: ['name', 'pointerToAnotherClass'],
			context,
		})
	})

	it('should call getObjects with multiple pointer', async () => {
		mockGetObjects.mockResolvedValueOnce([
			{
				id: '123',
				pointerToAnotherClass: 'anotherClassId',
				pointerToAnotherClass2: 'anotherClass2Id',
			},
		] as never)

		mockGetObject.mockResolvedValueOnce({
			id: 'anotherClassId',
			name: 'anotherClassName',
		} as never)

		mockGetObject.mockResolvedValueOnce({
			age: 'anotherClass2Age',
		} as never)

		const databaseController = new DatabaseController(mockAdapter() as any)

		const res = await databaseController.getObjects({
			className: 'TestClass',
			where: {
				id: {
					equalTo: '123',
				},
			},
			fields: [
				'name',
				'pointerToAnotherClass.id',
				'pointerToAnotherClass.name',
				'pointerToAnotherClass2.age',
			],
			context,
		})

		expect(res).toEqual([
			{
				id: '123',
				pointerToAnotherClass: {
					id: 'anotherClassId',
					name: 'anotherClassName',
				},
				pointerToAnotherClass2: {
					age: 'anotherClass2Age',
				},
			},
		])

		expect(mockGetObject).toHaveBeenCalledTimes(2)
		expect(mockGetObject).toHaveBeenNthCalledWith(1, {
			className: 'AnotherClass',
			id: 'anotherClassId',
			fields: ['id', 'name'],
			context,
		})
		expect(mockGetObject).toHaveBeenNthCalledWith(2, {
			className: 'AnotherClass2',
			id: 'anotherClass2Id',
			fields: ['age'],
			context,
		})

		expect(mockGetObjects).toHaveBeenCalledTimes(1)
		expect(mockGetObjects).toHaveBeenNthCalledWith(1, {
			className: 'TestClass',
			fields: ['name', 'pointerToAnotherClass', 'pointerToAnotherClass2'],
			context,
			where: {
				id: { equalTo: '123' },
			},
		})
	})
})
