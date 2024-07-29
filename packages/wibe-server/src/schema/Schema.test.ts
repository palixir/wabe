import { describe, expect, it } from 'bun:test'
import { Schema } from './Schema'

describe('Schema', () => {
	it('should merge default class with custom class', () => {
		const schema = new Schema({
			schema: {
				classes: [
					{
						name: 'Class1',
						fields: {
							field1: {
								type: 'String',
							},
							field2: {
								type: 'Int',
							},
						},
					},
					{
						name: 'Class2',
						fields: {
							field3: {
								type: 'String',
							},
							field4: {
								type: 'Int',
							},
						},
					},
					{
						name: 'Class1',
						fields: {
							fields3: {
								type: 'String',
							},
						},
					},
				],
			},
		} as any)

		expect(schema.schema.classes[0]).toEqual({
			name: 'Class1',
			fields: {
				field1: {
					type: 'String',
				},
				field2: {
					type: 'Int',
				},
				fields3: {
					type: 'String',
				},
				createdAt: {
					type: 'Date',
					required: true,
				},
				updatedAt: {
					type: 'Date',
					required: true,
				},
				acl: expect.any(Object),
			},
		})

		expect(schema.schema.classes[1]).toEqual({
			name: 'Class2',
			fields: {
				field3: {
					type: 'String',
				},
				field4: {
					type: 'Int',
				},
				createdAt: {
					type: 'Date',
					required: true,
				},
				updatedAt: {
					type: 'Date',
					required: true,
				},
				acl: expect.any(Object),
			},
		})
	})

	it('should merge default class with custom class with resolvers', () => {
		const schema = new Schema({
			schema: {
				classes: [
					{
						name: 'Class1',
						fields: {
							field1: {
								type: 'String',
							},
							field2: {
								type: 'Int',
							},
						},
					},
					{
						name: 'Class2',
						fields: {
							field3: {
								type: 'String',
							},
							field4: {
								type: 'Int',
							},
						},
					},
					{
						name: 'Class1',
						fields: {
							field1: {
								type: 'Int',
								defaultValue: 1,
							},
						},
					},
				],
				resolvers: {
					queries: {
						getClass1: {
							type: 'String',
							resolve: () => 'Class1',
						},
						getClass2: {
							type: 'String',
							resolve: () => 'Class1',
						},
					},
				},
			},
		} as any)

		expect(schema.schema.classes[0]).toEqual({
			name: 'Class1',
			fields: {
				field1: {
					type: 'Int',
					defaultValue: 1,
				},
				field2: {
					type: 'Int',
				},
				createdAt: {
					type: 'Date',
					required: true,
				},
				updatedAt: {
					type: 'Date',
					required: true,
				},
				acl: expect.any(Object),
			},
		})

		expect(schema.schema.classes[1]).toEqual({
			name: 'Class2',
			fields: {
				field3: {
					type: 'String',
				},
				field4: {
					type: 'Int',
				},
				createdAt: {
					type: 'Date',
					required: true,
				},
				updatedAt: {
					type: 'Date',
					required: true,
				},
				acl: expect.any(Object),
			},
		})
	})

	it('should merge default class with custom class with field with same name', () => {
		const schema = new Schema({
			schema: {
				classes: [
					{
						name: 'Class1',
						fields: {
							field1: {
								type: 'String',
							},
							field2: {
								type: 'Int',
							},
						},
					},
					{
						name: 'Class2',
						fields: {
							field3: {
								type: 'String',
							},
							field4: {
								type: 'Int',
							},
						},
					},
					{
						name: 'Class1',
						fields: {
							field1: {
								type: 'Int',
								defaultValue: 1,
							},
						},
					},
				],
			},
		} as any)

		expect(schema.schema.classes[0]).toEqual({
			name: 'Class1',
			fields: {
				field1: {
					type: 'Int',
					defaultValue: 1,
				},
				field2: {
					type: 'Int',
				},
				createdAt: {
					type: 'Date',
					required: true,
				},
				updatedAt: {
					type: 'Date',
					required: true,
				},
				acl: expect.any(Object),
			},
		})

		expect(schema.schema.classes[1]).toEqual({
			name: 'Class2',
			fields: {
				field3: {
					type: 'String',
				},
				field4: {
					type: 'Int',
				},
				createdAt: {
					type: 'Date',
					required: true,
				},
				updatedAt: {
					type: 'Date',
					required: true,
				},
				acl: expect.any(Object),
			},
		})
	})

	it('should merge default class with custom class with same different description', () => {
		const schema = new Schema({
			schema: {
				classes: [
					{
						name: 'Class1',
						description: 'Class1 description',
						fields: {
							field1: {
								type: 'String',
							},
							field2: {
								type: 'Int',
							},
						},
					},
					{
						name: 'Class2',
						fields: {
							field3: {
								type: 'String',
							},
							field4: {
								type: 'Int',
							},
						},
					},
					{
						name: 'Class1',
						description: 'new Class1 description',
						fields: {
							field1: {
								type: 'Int',
								defaultValue: 1,
							},
						},
					},
				],
			},
		} as any)

		expect(schema.schema.classes[0]).toEqual({
			name: 'Class1',
			description: 'new Class1 description',
			fields: {
				field1: {
					type: 'Int',
					defaultValue: 1,
				},
				field2: {
					type: 'Int',
				},
				createdAt: {
					type: 'Date',
					required: true,
				},
				updatedAt: {
					type: 'Date',
					required: true,
				},
				acl: expect.any(Object),
			},
		})

		expect(schema.schema.classes[1]).toEqual({
			name: 'Class2',
			fields: {
				field3: {
					type: 'String',
				},
				field4: {
					type: 'Int',
				},
				createdAt: {
					type: 'Date',
					required: true,
				},
				updatedAt: {
					type: 'Date',
					required: true,
				},
				acl: expect.any(Object),
			},
		})
	})

	it('should add default class', () => {
		const schema = new Schema({ schema: { classes: [] } } as any)

		expect(schema.schema.classes.length).toBe(3)
		expect(schema.schema.classes[0].name).toEqual('User')
		expect(schema.schema.classes[1].name).toEqual('_Session')
		expect(schema.schema.classes[2].name).toEqual('Role')
	})

	it('should add default enums', () => {
		const schema = new Schema({
			schema: {
				classes: [],
				enums: [
					{
						name: 'EnumTest',
						values: {
							A: 'A',
							B: 'B',
						},
					},
				],
			},
		} as any)

		expect(schema.schema.enums).toEqual([
			{
				name: 'EnumTest',
				values: {
					A: 'A',
					B: 'B',
				},
			},
			{
				name: 'AuthenticationProvider',
				values: expect.any(Object),
			},
			{
				name: 'SecondaryFactor',
				values: expect.any(Object),
			},
		])
	})
})
