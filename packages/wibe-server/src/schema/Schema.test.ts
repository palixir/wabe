import { describe, expect, it, beforeAll, afterAll } from 'bun:test'
import { setupTests } from '../utils/helper'
import { WibeApp } from '../server'
import { Schema } from './Schema'

describe('Schema', () => {
	let wibe: WibeApp
	let port: number

	beforeAll(async () => {
		const setup = await setupTests()
		wibe = setup.wibe
		port = setup.port
	})

	afterAll(async () => {
		await wibe.close()
	})

	it('should display a message if no identifier is provided in custom authentication schema', () => {
		WibeApp.config.authentication = {
			customAuthenticationMethods: [
				{
					name: 'EmailPassword',
					input: {
						notAnIdentifier: { type: 'Email', required: true },
						password: { type: 'String', required: true },
					},
					events: {
						onSignUp: async (input, context) => {
							return true
						},
						onLogin: async (input, context) => {
							return true
						},
					},
				},
			],
		}

		expect(
			() =>
				new Schema({
					class: [],
					enums: [],
				}),
		).toThrow(
			"EmailPassword authentication method must have an 'identifier' field.",
		)

		WibeApp.config.authentication = {
			customAuthenticationMethods: [
				{
					name: 'EmailPassword',
					input: {
						identifier: { type: 'Email', required: true },
						password: { type: 'String', required: true },
					},
					events: {
						onSignUp: async (input, context) => {
							return true
						},
						onLogin: async (input, context) => {
							return true
						},
					},
				},
			],
		}
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
