import { beforeAll, describe, expect, it, mock } from 'bun:test'
import { Schema, WibeSchemaType } from './Schema'

describe('Schema', () => {
	let schema: Schema

	beforeAll(async () => {
		schema = new Schema([
			{
				name: 'Collection1',
				fields: {
					name: {
						type: WibeSchemaType.String,
						defaultValue: 'Lucas',
					},
					age: { type: WibeSchemaType.Int, defaultValue: 23 },
					isReady: {
						type: WibeSchemaType.Boolean,
						defaultValue: true,
					},
				},
			},
		])
	})

	it('should write schema types in output file', () => {
		const output = schema.getTypesFromSchema()

		expect(output).toEqual(
			'export type Collection1 = {\n  name: string,\n  age: number,\n  isReady: boolean\n}\nexport type WibeTypes = {\n  Collection1: Collection1\n}',
		)
	})

	it('should not write schema with invalid schema', () => {
		const invalidSchema = new Schema([
			{
				name: 'Collection1',
				fields: {
					// @ts-expect-error
					invalidField: { type: 'tata', defaultValue: 'Lucas' },
				},
			},
		])

		expect(() => invalidSchema.getTypesFromSchema()).toThrow(
			Error('Invalid type: tata'),
		)
	})
})
