import { beforeAll, describe, expect, it, mock } from 'bun:test'
import { Schema } from './Schema'

describe('Schema', () => {
	let schema: Schema

	beforeAll(async () => {
		schema = new Schema({
			class: [
				{
					name: 'Collection1',
					fields: {
						name: {
							type: 'String',
							defaultValue: 'Lucas',
						},
						age: { type: 'Int', defaultValue: 23 },
						isReady: {
							type: 'Boolean',
							defaultValue: true,
						},
					},
				},
			],
			scalars: [
				{
					name: 'Phone',
					description: 'Phone custom scalar type',
				},
				{
					name: 'Email',
					description: 'Email custom scalar type',
				},
			],
		})
	})

	it('should write schema types in output file', () => {
		const output = schema.getTypesFromSchema()

		expect(output).toEqual(
			'export type Collection1 = {\n  name: string,\n  age: number,\n  isReady: boolean\n}\nexport type WibeSchemaScalars = "Phone" | "Email"\nexport type WibeSchemaTypes = {\n  Collection1: Collection1\n}',
		)
	})

	it('should not write schema with invalid schema', () => {
		const invalidSchema = new Schema({
			class: [
				{
					name: 'Collection1',
					fields: {
						// @ts-expect-error
						invalidField: { type: 'tata', defaultValue: 'Lucas' },
					},
				},
			],
		})

		expect(() => invalidSchema.getTypesFromSchema()).toThrow(
			Error('Invalid type: tata'),
		)
	})
})
