import { describe, expect, it, beforeAll, afterAll } from 'bun:test'
import { setupTests } from '../utils/helper'
import { WibeApp } from '../server'
import { Schema } from './Schema'

describe('Schema', () => {
	let wibe: WibeApp

	beforeAll(async () => {
		const setup = await setupTests()
		wibe = setup.wibe
	})

	afterAll(async () => {
		await wibe.close()
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
		])
	})
})
