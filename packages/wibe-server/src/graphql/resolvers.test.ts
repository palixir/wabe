import { describe, expect, it, beforeAll, mock, beforeEach } from 'bun:test'
import type { GraphQLResolveInfo } from 'graphql'
import { executeRelationOnFields, getFieldsFromInfo } from './resolvers'
import { WibeApp } from '../server'

describe('Resolver', () => {
	const mockUpdateObject = mock(() => {})
	const mockGetObject = mock(() => {})
	const mockCreateObject = mock(() => {})

	const context = {}

	beforeEach(() => {
		mockUpdateObject.mockClear()
		mockGetObject.mockClear()
		mockCreateObject.mockClear()
	})

	beforeAll(() => {
		WibeApp.databaseController = {
			updateObject: mockUpdateObject,
			getObject: mockGetObject,
			createObject: mockCreateObject,
		} as any

		WibeApp.config = {
			schema: {
				class: [
					{
						name: 'TestClass',
						fields: {
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

			// @ts-expect-error
			const fields = getFieldsFromInfo(info.fieldNodes[0].selectionSet)
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

			const fields = getFieldsFromInfo(
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

			// @ts-expect-error
			const fields = getFieldsFromInfo(info.fieldNodes[0].selectionSet)

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

			const fields = getFieldsFromInfo(
				// @ts-expect-error
				info.fieldNodes[0].selectionSet,
				'className',
			)

			expect(fields).toEqual(['field2', 'field3'])
		})
	})

	it('should create an object when a pointer if passed in input with createAndLink', async () => {
		mockCreateObject.mockReturnValue({ id: 'createFieldId' } as any)

		const fields = {
			name: 'name',
			field2: { createAndLink: { field1: 'test' } },
		}

		const updatedFields = await executeRelationOnFields(
			fields,
			context as any,
		)

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

		const updatedFields = await executeRelationOnFields(
			fields,
			context as any,
		)

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

		const updatedFields = await executeRelationOnFields(
			fields,
			context as any,
		)

		expect(mockCreateObject).toHaveBeenCalledTimes(0)

		expect(updatedFields).toEqual({
			name: 'name',
			age: 20,
		} as any)
	})
})
