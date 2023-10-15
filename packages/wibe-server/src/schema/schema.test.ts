import { beforeAll, describe, expect, it, mock } from 'bun:test'
import { Schema } from './Schema'

describe('Schema', () => {
	let schema: Schema
	const mockCreateClass = mock(() => {})

	beforeAll(async () => {
		schema = new Schema({
			name: 'Collection1',
			fields: {
				name: { type: 'String', defaultValue: 'Lucas' },
				age: { type: 'Int', defaultValue: 23 },
			},
			databaseController: {
				createClass: mockCreateClass,
			} as any,
		})
	})

	it('should create a schema', async () => {
		await schema.create()

		expect(mockCreateClass).toHaveBeenCalledTimes(1)
	})
})
