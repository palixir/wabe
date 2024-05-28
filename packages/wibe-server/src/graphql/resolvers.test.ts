import { describe, expect, it, beforeAll, mock, beforeEach } from 'bun:test'
import type { GraphQLResolveInfo } from 'graphql'
import { executeRelationOnFields, extractFieldsFromSetNode } from './resolvers'
import { WibeApp } from '../server'

describe('Resolver', () => {
	const mockUpdateObject = mock(() => {})
	const mockGetObject = mock(() => {})
	const mockGetObjects = mock(() => {})
	const mockCreateObject = mock(() => {})
	const mockCreateObjects = mock(() => {})

	const context = {}

	beforeEach(() => {
		mockUpdateObject.mockClear()
		mockGetObjects.mockClear()
		mockGetObject.mockClear()
		mockCreateObject.mockClear()
		mockCreateObjects.mockClear()
	})

	beforeAll(() => {
		WibeApp.databaseController = {
			updateObject: mockUpdateObject,
			getObject: mockGetObject,
			getObjects: mockGetObjects,
			createObject: mockCreateObject,
			createObjects: mockCreateObjects,
		} as any

		WibeApp.config = {
			schema: {
				class: [
					{
						name: 'TestClass',
						fields: {
							name: {
								type: 'String',
							},
							field1: {
								type: 'String',
							},
						},
					},
					{
						name: 'TestClass2',
						fields: {
							name: {
								type: 'String',
							},
							age: {
								type: 'Int',
							},
							field2: {
								type: 'Pointer',
								// @ts-expect-error
								class: 'TestClass',
							},
						},
					},
				],
			},
		}
	})

	describe('getFieldsFromInfo', () => {
		it('should get all output fields of graphql resolvers with edge and node', () => {
			const info: GraphQLResolveInfo = {
				fieldNodes: [
					{
						selectionSet: {
							selections: [
								{
									// @ts-expect-error
									name: {
										value: 'edges',
									},
									selectionSet: {
										selections: [
											{
												// @ts-expect-error
												name: {
													value: 'node',
												},
												selectionSet: {
													selections: [
														{
															// @ts-expect-error
															name: {
																value: 'name',
															},
														},
														{
															// @ts-expect-error
															name: {
																value: 'age',
															},
														},
													],
												},
											},
										],
									},
								},
							],
						},
					},
				],
			}

			const fields = extractFieldsFromSetNode(
				// @ts-expect-error
				info.fieldNodes[0].selectionSet,
			)
			expect(fields).toEqual(['name', 'age'])
		})

		it('should get all output fields of graphql resolvers with one level', () => {
			const info: GraphQLResolveInfo = {
				fieldNodes: [
					{
						selectionSet: {
							selections: [
								{
									// @ts-expect-error
									name: {
										value: 'name',
									},
								},
								{
									// @ts-expect-error
									name: {
										value: 'age',
									},
								},
								{
									// @ts-expect-error
									name: {
										value: 'field2',
									},
								},
							],
						},
					},
				],
			}

			const fields = extractFieldsFromSetNode(
				// @ts-expect-error
				info.fieldNodes[0].selectionSet,
			)

			expect(fields).toEqual(['name', 'age', 'field2'])
		})

		it('should get all output fields of graphql resolvers with two level', () => {
			const info: GraphQLResolveInfo = {
				fieldNodes: [
					{
						selectionSet: {
							selections: [
								{
									// @ts-expect-error
									name: {
										value: 'name',
									},
								},
								{
									// @ts-expect-error
									name: {
										value: 'age',
									},
								},
								{
									// @ts-expect-error
									name: {
										value: 'field1',
									},
									selectionSet: {
										selections: [
											{
												// @ts-expect-error
												name: {
													value: 'field2',
												},
											},
										],
									},
								},
							],
						},
					},
				],
			}

			const fields = extractFieldsFromSetNode(
				// @ts-expect-error
				info.fieldNodes[0].selectionSet,
			)

			expect(fields).toEqual(['name', 'age', 'field1.field2'])
		})

		it('should get all output fields of graphql resolvers for a mutation output (ignore className)', () => {
			const info: GraphQLResolveInfo = {
				fieldNodes: [
					{
						selectionSet: {
							selections: [
								{
									// @ts-expect-error
									name: {
										value: 'className',
									},
									selectionSet: {
										selections: [
											{
												// @ts-expect-error
												name: {
													value: 'field2',
												},
											},
											{
												// @ts-expect-error
												name: {
													value: 'field3',
												},
											},
										],
									},
								},
							],
						},
					},
				],
			}

			const fields = extractFieldsFromSetNode(
				// @ts-expect-error
				info.fieldNodes[0].selectionSet,
				'className',
			)

			expect(fields).toEqual(['field2', 'field3'])
		})
	})

	it('should create a list of objects if a relation is passed in input with createAndAdd (on create)', async () => {
		mockCreateObjects.mockReturnValue([{ id: 'createFieldId' }] as any)

		const fields = {
			name: 'name',
			field2: { createAndAdd: [{ field1: 'test' }] },
		}

		const updatedFields = await executeRelationOnFields({
			className: 'TestClass2',
			fields,
			context: context as any,
		})

		expect(mockCreateObjects).toHaveBeenCalledTimes(1)
		expect(mockCreateObjects).toHaveBeenCalledWith({
			className: 'TestClass',
			data: [{ field1: 'test' }],
			fields: ['id'],
			context,
		})

		expect(updatedFields).toEqual({
			name: 'name',
			field2: ['createFieldId'],
		} as any)
	})

	it('should add an element to the list of element when a field is passed with add (on create)', async () => {
		const fields = {
			name: 'name',
			field2: { add: ['idToAdd'] },
		}

		const updatedFields = await executeRelationOnFields({
			className: 'TestClass',
			fields,
			context: context as any,
			typeOfExecution: 'create',
		})

		expect(updatedFields).toEqual({
			name: 'name',
			field2: ['idToAdd'],
		} as any)
	})

	it('should remove an element to the list of element when a field is passed with remove (on create)', async () => {
		const fields = {
			name: 'name',
			field2: { remove: ['idToRemove'] },
		}

		const updatedFields = await executeRelationOnFields({
			className: 'TestClass2',
			fields,
			context: context as any,
			typeOfExecution: 'create',
		})

		expect(updatedFields).toEqual({
			name: 'name',
			field2: [],
		} as any)
	})

	it('should create a list of objects if a relation is passed in input with createAndAdd (on update)', async () => {
		mockCreateObjects.mockReturnValue([{ id: 'createFieldId' }] as any)

		const fields = {
			name: 'name',
			field2: { createAndAdd: [{ field1: 'test' }] },
		}

		const updatedFields = await executeRelationOnFields({
			className: 'TestClass2',
			fields,
			context: context as any,
			typeOfExecution: 'update',
		})

		expect(mockCreateObjects).toHaveBeenCalledTimes(1)
		expect(mockCreateObjects).toHaveBeenCalledWith({
			className: 'TestClass',
			data: [{ field1: 'test' }],
			fields: ['id'],
			context,
		})

		expect(updatedFields).toEqual({
			name: 'name',
			field2: ['createFieldId'],
		} as any)
	})

	it('should add an element to the list of element when a field is passed with add (on update)', async () => {
		mockGetObject.mockReturnValue({ field2: ['olderId'] } as any)

		const fields = {
			name: 'name',
			field2: { add: ['idToAdd'] },
		}

		const updatedFields = await executeRelationOnFields({
			className: 'TestClass2',
			fields,
			id: 'id',
			context: context as any,
			typeOfExecution: 'update',
		})

		expect(mockGetObject).toHaveBeenCalledTimes(1)
		expect(mockGetObject).toHaveBeenCalledWith({
			className: 'TestClass',
			fields: ['field2'],
			id: 'id',
		})

		expect(updatedFields).toEqual({
			name: 'name',
			field2: ['olderId', 'idToAdd'],
		} as any)
	})

	it('should remove an element from the list of element when a field is passed with remove (on update)', async () => {
		mockGetObject.mockReturnValue({ field2: ['olderId'] } as any)

		const fields = {
			name: 'name',
			field2: { remove: ['olderId'] },
		}

		const updatedFields = await executeRelationOnFields({
			className: 'TestClass2',
			fields,
			id: 'id',
			context: context as any,
			typeOfExecution: 'update',
		})

		expect(mockGetObject).toHaveBeenCalledTimes(1)
		expect(mockGetObject).toHaveBeenCalledWith({
			className: 'TestClass',
			fields: ['field2'],
			id: 'id',
		})

		expect(updatedFields).toEqual({
			name: 'name',
			field2: [],
		} as any)
	})

	it('should create a list of objects if a relation is passed in input with createAndAdd (on updateMany)', async () => {
		mockCreateObjects.mockReturnValue([{ id: 'createFieldId' }] as any)

		const fields = {
			name: 'name',
			field2: { createAndAdd: [{ field1: 'test' }] },
		}

		const updatedFields = await executeRelationOnFields({
			className: 'TestClass2',
			fields,
			context: context as any,
			typeOfExecution: 'updateMany',
		})

		expect(mockCreateObjects).toHaveBeenCalledTimes(1)
		expect(mockCreateObjects).toHaveBeenCalledWith({
			className: 'TestClass',
			data: [{ field1: 'test' }],
			fields: ['id'],
			context,
		})

		expect(updatedFields).toEqual({
			name: 'name',
			field2: ['createFieldId'],
		} as any)
	})

	it('should add an element to the list of element when a field is passed with add (on updateMany)', async () => {
		mockGetObjects.mockReturnValue([
			{ id: 'objectId', field2: ['olderId'] },
		] as any)

		const fields = {
			name: 'name',
			field2: { add: ['idToAdd'] },
		}

		const updatedFields = await executeRelationOnFields({
			className: 'TestClass2',
			fields,
			context: context as any,
			typeOfExecution: 'updateMany',
			where: {
				id: { equalTo: 'id' },
			},
		})

		expect(mockGetObjects).toHaveBeenCalledTimes(1)
		expect(mockGetObjects).toHaveBeenCalledWith({
			className: 'TestClass',
			fields: ['field2'],
			where: {
				id: { equalTo: 'id' },
			},
		})

		expect(mockUpdateObject).toHaveBeenCalledTimes(1)
		expect(mockUpdateObject).toHaveBeenCalledWith({
			className: 'TestClass',
			data: { field2: ['olderId', 'idToAdd'] },
			id: 'objectId',
			context,
		})

		expect(updatedFields).toEqual({
			name: 'name',
		} as any)
	})

	it('should remove an element from the list of element when a field is passed with remove (on updateMany)', async () => {
		mockGetObjects.mockReturnValue([
			{ id: 'objectId', field2: ['olderId'] },
		] as any)

		const fields = {
			name: 'name',
			field2: { remove: ['olderId'] },
		}

		const updatedFields = await executeRelationOnFields({
			className: 'TestClass2',
			fields,
			context: context as any,
			typeOfExecution: 'updateMany',
			where: {
				id: { equalTo: 'id' },
			},
		})

		expect(mockGetObjects).toHaveBeenCalledTimes(1)
		expect(mockGetObjects).toHaveBeenCalledWith({
			className: 'TestClass2',
			fields: ['id'],
			where: {
				id: { equalTo: 'id' },
			},
		})

		expect(mockUpdateObject).toHaveBeenCalledTimes(1)
		expect(mockUpdateObject).toHaveBeenCalledWith({
			className: 'TestClass2',
			data: { field2: [] },
			id: 'objectId',
			context,
		})

		expect(updatedFields).toEqual({
			name: 'name',
		} as any)
	})

	it('should create an object when if a pointer is passed in input with createAndLink', async () => {
		mockCreateObject.mockReturnValue({ id: 'createFieldId' } as any)

		const fields = {
			name: 'name',
			field2: { createAndLink: { field1: 'test' } },
		}

		const updatedFields = await executeRelationOnFields({
			className: 'TestClass2',
			fields,
			context: context as any,
		})

		expect(mockCreateObject).toHaveBeenCalledTimes(1)
		expect(mockCreateObject).toHaveBeenCalledWith({
			className: 'TestClass',
			data: { field1: 'test' },
			fields: ['id'],
			context,
		})

		expect(updatedFields).toEqual({
			name: 'name',
			field2: 'createFieldId',
		} as any)
	})

	it('should update the id when a pointer if passed in input with link', async () => {
		const fields = {
			name: 'name',
			field2: { link: 'alreadyExistingObjectId' },
		}

		const updatedFields = await executeRelationOnFields({
			className: 'TestClass',
			fields,
			context: context as any,
		})

		expect(mockCreateObject).toHaveBeenCalledTimes(0)

		expect(updatedFields).toEqual({
			name: 'name',
			field2: 'alreadyExistingObjectId',
		} as any)
	})

	it('should not create a pointer if no pointer in input', async () => {
		const fields = {
			name: 'name',
			age: 20,
		}

		const updatedFields = await executeRelationOnFields({
			className: 'TestClass',
			fields,
			context: context as any,
		})

		expect(mockCreateObject).toHaveBeenCalledTimes(0)

		expect(updatedFields).toEqual({
			name: 'name',
			age: 20,
		} as any)
	})
})
