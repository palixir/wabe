import {
	describe,
	it,
	expect,
	mock,
	beforeAll,
	beforeEach,
	spyOn,
} from 'bun:test'
import { WibeApp } from '../../server'
import { DatabaseController } from '..'

describe('DatabaseController', () => {
	const mockGetObject = mock(() => {})
	const mockGetObjects = mock(() => {})
	const mockCreateObject = mock(() => {})
	const mockCreateObjects = mock(() => {})
	const mockUpdateObject = mock(() => {})
	const mockUpdateObjects = mock(() => {})
	const mockDeleteObject = mock(() => {})
	const mockDeleteObjects = mock(() => {})

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

	beforeAll(() => {
		WibeApp.config = {
			schema: {
				class: [
					{
						name: 'TestClass',
						fields: {
							pointerToAnotherClass: {
								type: 'Pointer',
								// @ts-expect-error
								class: 'AnotherClass',
							},
							pointerToAnotherClass2: {
								type: 'Pointer',
								// @ts-expect-error
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
								// @ts-expect-error
								class: 'AnotherClass3',
							},
						},
					},
				],
			},
		}
	})

	beforeEach(() => {
		mockGetObject.mockClear()
		mockGetObjects.mockClear()
	})

	it('should return true if there is at least one relation field (_isRelationField)', () => {
		const databaseController = new DatabaseController(mockAdapter() as any)

		expect(
			databaseController._isRelationField(
				// @ts-expect-error
				'AnotherClass4',
				'AnotherClass3',
			),
		).toBe(true)
	})

	it('should return false if the field is not Pointer of the class', () => {
		const databaseController = new DatabaseController(mockAdapter() as any)

		expect(
			databaseController._isRelationField(
				'AnotherClass3' as any,
				'AnotherClass4',
			),
		).toBe(false)
	})

	it('should getObject with one relation field', async () => {
		mockGetObject.mockResolvedValueOnce({
			id: '123',
			relationToAnotherClass3: 'anotherClass3Id',
		} as never)

		mockGetObjects.mockResolvedValueOnce([
			{
				id: 'anotherClass3Id',
				name: 'anotherClass3Name',
			},
		] as never)

		const databaseController = new DatabaseController(mockAdapter() as any)

		const res = await databaseController.getObject({
			// @ts-expect-error
			className: 'AnotherClass4',
			id: '123',
			fields: [
				// @ts-expect-error
				'relationToAnotherClass3.id',
				// @ts-expect-error
				'relationToAnotherClass3.field4',
			],
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
			fields: ['relationToAnotherClass3'],
		})

		expect(mockGetObjects).toHaveBeenCalledTimes(1)
		expect(mockGetObjects).toHaveBeenCalledWith({
			className: 'AnotherClass3',
			where: { id: { equalTo: 'anotherClass3Id' } },
			fields: ['id', 'field4'],
		})
	})

	it('should getObjects with one relation field', async () => {
		mockGetObjects.mockResolvedValueOnce([
			{
				id: '123',
				relationToAnotherClass3: 'anotherClass3Id',
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
			// @ts-expect-error
			className: 'AnotherClass4',
			where: { id: { equalTo: '123' } },
			fields: [
				// @ts-expect-error
				'relationToAnotherClass3.id',
				// @ts-expect-error
				'relationToAnotherClass3.field4',
			],
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
			fields: ['relationToAnotherClass3'],
		})
		expect(mockGetObjects).toHaveBeenNthCalledWith(2, {
			className: 'AnotherClass3',
			where: { id: { equalTo: 'anotherClass3Id' } },
			fields: ['id', 'field4'],
		})
	})

	it('should get the object with pointer data', async () => {
		const databaseController = new DatabaseController(mockAdapter() as any)

		spyOn(databaseController, '_isPointerField').mockReturnValueOnce(true)

		await databaseController._getFinalObjectWithPointer(
			{
				// @ts-expect-error
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
		)

		expect(mockGetObject).toHaveBeenCalledTimes(1)
		expect(mockGetObject).toHaveBeenCalledWith({
			className: 'AnotherClass',
			fields: ['field1'],
			id: 'idOfAnotherClass',
		})
	})

	it('should return true if the field is a Pointer of the class', () => {
		const databaseController = new DatabaseController(mockAdapter() as any)

		expect(
			databaseController._isPointerField(
				'testClass' as any,
				'anotherClass',
			),
		).toBe(true)
	})

	it('should return false if the field is not Pointer of the class', () => {
		const databaseController = new DatabaseController(mockAdapter() as any)

		expect(
			databaseController._isPointerField(
				'anotherClass' as any,
				'anotherClass2',
			),
		).toBe(false)
	})

	it('should return false if the field is not Pointer of the class (class not exist)', () => {
		const databaseController = new DatabaseController(mockAdapter() as any)

		expect(
			databaseController._isPointerField(
				'invalidClass' as any,
				'anotherClass2',
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
			databaseController._getPointerObject('TestClass', fields),
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
			databaseController._getPointerObject('TestClass', fields),
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
			// @ts-expect-error
			className: 'TestClass',
			id: '123',
		})

		expect(mockGetObject).toHaveBeenCalledTimes(1)
		expect(mockGetObject).toHaveBeenNthCalledWith(1, {
			className: 'TestClass',
			id: '123',
			fields: [],
		})
	})

	it('should getObject without pointer', async () => {
		mockGetObject.mockResolvedValueOnce({
			id: '123',
			name: 'name',
		} as never)

		const databaseController = new DatabaseController(mockAdapter() as any)

		const res = await databaseController.getObject({
			// @ts-expect-error
			className: 'TestClass',
			id: '123',
			// @ts-expect-error
			fields: ['name'],
		})

		expect(res).toEqual({
			id: '123',
			// @ts-expect-error
			name: 'name',
		})

		expect(mockGetObject).toHaveBeenCalledTimes(1)
		expect(mockGetObject).toHaveBeenNthCalledWith(1, {
			className: 'TestClass',
			id: '123',
			fields: ['name'],
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
			// @ts-expect-error
			className: 'TestClass',
			id: '123',
			fields: [
				// @ts-expect-error
				'name',
				// @ts-expect-error
				'pointerToAnotherClass.id',
				// @ts-expect-error
				'pointerToAnotherClass.name',
			],
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
			fields: ['name', 'pointerToAnotherClass'],
		})

		expect(mockGetObject).toHaveBeenNthCalledWith(2, {
			className: 'AnotherClass',
			id: 'anotherClassId',
			fields: ['id', 'name'],
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
			// @ts-expect-error
			className: 'TestClass',
			id: '123',
			fields: [
				// @ts-expect-error
				'name',
				// @ts-expect-error
				'pointerToAnotherClass.id',
				// @ts-expect-error
				'pointerToAnotherClass.name',
				// @ts-expect-error
				'pointerToAnotherClass2.age',
			],
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
			fields: ['name', 'pointerToAnotherClass', 'pointerToAnotherClass2'],
		})

		expect(mockGetObject).toHaveBeenNthCalledWith(2, {
			className: 'AnotherClass',
			id: 'anotherClassId',
			fields: ['id', 'name'],
		})

		expect(mockGetObject).toHaveBeenNthCalledWith(3, {
			className: 'AnotherClass2',
			id: 'anotherClass2Id',
			fields: ['age'],
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
			// @ts-expect-error
			className: 'TestClass',
			id: '123',
		})

		expect(mockGetObjects).toHaveBeenCalledTimes(1)
		expect(mockGetObjects).toHaveBeenNthCalledWith(1, {
			className: 'TestClass',
			id: '123',
			fields: [],
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
			// @ts-expect-error
			className: 'TestClass',
			id: '123',
			fields: [
				// @ts-expect-error
				'name',
			],
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
			id: '123',
			fields: ['name'],
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
			// @ts-expect-error
			className: 'TestClass',
			id: '123',
			fields: [
				// @ts-expect-error
				'name',
				// @ts-expect-error
				'pointerToAnotherClass.id',
				// @ts-expect-error
				'pointerToAnotherClass.name',
			],
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
		})

		expect(mockGetObjects).toHaveBeenCalledTimes(1)
		expect(mockGetObjects).toHaveBeenNthCalledWith(1, {
			className: 'TestClass',
			id: '123',
			fields: ['name', 'pointerToAnotherClass'],
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
			// @ts-expect-error
			className: 'TestClass',
			id: '123',
			fields: [
				// @ts-expect-error
				'name',
				// @ts-expect-error
				'pointerToAnotherClass.id',
				// @ts-expect-error
				'pointerToAnotherClass.name',
				// @ts-expect-error
				'pointerToAnotherClass2.age',
			],
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
		})
		expect(mockGetObject).toHaveBeenNthCalledWith(2, {
			className: 'AnotherClass2',
			id: 'anotherClass2Id',
			fields: ['age'],
		})

		expect(mockGetObjects).toHaveBeenCalledTimes(1)
		expect(mockGetObjects).toHaveBeenNthCalledWith(1, {
			className: 'TestClass',
			id: '123',
			fields: ['name', 'pointerToAnotherClass', 'pointerToAnotherClass2'],
		})
	})
})
