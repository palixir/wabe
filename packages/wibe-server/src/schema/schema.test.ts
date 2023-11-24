import { beforeAll, describe, expect, it, mock, spyOn } from 'bun:test'
import { Schema } from './Schema'
import { WibeType } from './interface'
import { WibeApp } from '../server'

const mockCreateClass = mock(() => Promise.resolve())

// @ts-expect-error
WibeApp.databaseController = { createClass: mockCreateClass }

describe('Schema', () => {
	let schema: Schema

	beforeAll(async () => {
		schema = new Schema({
			name: 'Collection1',
			fields: {
				name: { type: WibeType.String, defaultValue: 'Lucas' },
				age: { type: WibeType.Int, defaultValue: 23 },
			},
		})
	})

	it('should create a schema', async () => {
		await schema.create()

		expect(mockCreateClass).toHaveBeenCalledTimes(1)
	})
})
