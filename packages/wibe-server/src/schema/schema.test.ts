import { beforeAll, describe, expect, it, mock } from 'bun:test'
import { Schema, WibeScalarType } from './Schema'

describe('Schema', () => {
	let schema: Schema

	beforeAll(async () => {
		schema = new Schema([
			{
				name: 'Collection1',
				fields: {
					name: {
						type: WibeScalarType.String,
						defaultValue: 'Lucas',
					},
					age: { type: WibeScalarType.Int, defaultValue: 23 },
					isReady: {
						type: WibeScalarType.Boolean,
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
					// @ts-ignore
					invalidField: { type: 'tata', defaultValue: 'Lucas' },
				},
			},
		])

		expect(() => invalidSchema.getTypesFromSchema()).toThrow(
			Error('Invalid type: tata'),
		)
	})
})
