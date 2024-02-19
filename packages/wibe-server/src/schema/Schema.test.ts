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

	it('should add default _User class', () => {
		const schema = new Schema({
			class: [
				{
					name: '_User',
					fields: {
						tata: { type: 'String' },
					},
					resolvers: {
						queries: {
							toto: {
								type: 'Boolean',
								resolve: () => true,
							},
						},
					},
				},
			],
		})

		expect(schema.schema.class).toEqual([
			{
				description: undefined,
				name: '_User',
				fields: {
					tata: { type: 'String' },
					provider: { type: 'AuthenticationProvider' },
					email: { type: 'Email', required: true },
					password: { type: 'String' },
					accessToken: { type: 'String' },
					refreshToken: { type: 'String' },
					verifiedEmail: { type: 'Boolean' },
					createdAt: { type: 'Date' },
					updatedAt: {
						type: 'Date',
					},
				},
				resolvers: {
					mutations: {
						signOut: expect.any(Object),
						signIn: expect.any(Object),
						signUp: expect.any(Object),
						signInWithProvider: expect.any(Object),
						signInWith: expect.any(Object),
					},
					queries: {
						toto: {
							type: 'Boolean',
							resolve: expect.any(Function),
						},
					},
				},
			},
		])
	})
})
