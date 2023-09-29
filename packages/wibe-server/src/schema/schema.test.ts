import { beforeAll, describe, expect, it, mock } from 'bun:test'
import { Schema } from './schema'

describe('Schema', () => {
	let schema: Schema
	const mockCreateClass = mock(() => {})

	beforeAll(async () => {
		schema = new Schema({
			name: 'Collection1',
			fields: {
				name: { type: 'string', defaultValue: 'Lucas' },
				age: { type: 'number', defaultValue: 23 },
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
