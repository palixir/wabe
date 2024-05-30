import { describe, expect, it } from 'bun:test'
import { Schema } from './Schema'

describe('Schema', () => {
	it('should merge default class with custom class', () => {
		const schema = new Schema({
			class: [
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
		})

		expect(schema.schema.class[0]).toEqual({
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
			},
		})

		expect(schema.schema.class[1]).toEqual({
			name: 'Class2',
			fields: {
				field3: {
					type: 'String',
				},
				field4: {
					type: 'Int',
				},
			},
		})
	})

	it('should merge default class with custom class with resolvers', () => {
		const schema = new Schema({
			class: [
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
					resolvers: {
						queries: {
							getClass1: {
								type: 'String',
								resolve: () => 'Class1',
							},
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
					resolvers: {
						queries: {
							getClass2: {
								type: 'String',
								resolve: () => 'Class1',
							},
						},
					},
				},
			],
		})

		expect(schema.schema.class[0]).toEqual({
			name: 'Class1',
			fields: {
				field1: {
					type: 'Int',
					defaultValue: 1,
				},
				field2: {
					type: 'Int',
				},
			},
			resolvers: {
				queries: {
					getClass1: {
						type: 'String',
						resolve: expect.any(Function),
					},
					getClass2: {
						type: 'String',
						resolve: expect.any(Function),
					},
				},
			},
		})

		expect(schema.schema.class[1]).toEqual({
			name: 'Class2',
			fields: {
				field3: {
					type: 'String',
				},
				field4: {
					type: 'Int',
				},
			},
		})
	})

	it('should merge default class with custom class with field with same name', () => {
		const schema = new Schema({
			class: [
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
		})

		expect(schema.schema.class[0]).toEqual({
			name: 'Class1',
			fields: {
				field1: {
					type: 'Int',
					defaultValue: 1,
				},
				field2: {
					type: 'Int',
				},
			},
		})

		expect(schema.schema.class[1]).toEqual({
			name: 'Class2',
			fields: {
				field3: {
					type: 'String',
				},
				field4: {
					type: 'Int',
				},
			},
		})
	})

	it('should merge default class with custom class with same different description', () => {
		const schema = new Schema({
			class: [
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
		})

		expect(schema.schema.class[0]).toEqual({
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
			},
		})

		expect(schema.schema.class[1]).toEqual({
			name: 'Class2',
			fields: {
				field3: {
					type: 'String',
				},
				field4: {
					type: 'Int',
				},
			},
		})
	})

	it('should add default class', () => {
		const schema = new Schema({ class: [] })

		expect(schema.schema.class.length).toBe(3)
		expect(schema.schema.class[0].name).toEqual('_User')
		expect(schema.schema.class[1].name).toEqual('_Session')
		expect(schema.schema.class[2].name).toEqual('_Role')
	})

	it('should add default enums', () => {
		const schema = new Schema({
			class: [],
			enums: [
				{
					name: 'EnumTest',
					values: {
						A: 'A',
						B: 'B',
					},
				},
			],
		})

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
