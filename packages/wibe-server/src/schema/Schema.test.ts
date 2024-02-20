import { describe, expect, it } from 'bun:test'
import { Schema } from './Schema'

describe('Schema', () => {
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
		])
	})
})
