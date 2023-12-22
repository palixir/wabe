import { beforeAll, describe, expect, it } from 'bun:test'
import { Schema } from './Schema'
import { DatabaseEnum } from '../database'
import { WibeApp } from '../server'

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
			enums: [
				{
					name: 'Role',
					values: {
						Admin: 'admin',
						Member: 'member',
					},
				},
			],
		})
	})

	it('should write schema types in output file', () => {
		const output = schema.getTypesFromSchema()

		expect(output).toEqual(
			`export type Collection1 = {\n  name: string,\n  age: number,\n  isReady: boolean\n}\n\nexport type WibeSchemaScalars = "Phone" | "Email"\n\nexport enum Role {\n	Admin = 'admin',\n	Member = 'member',\n}\n\nexport type WibeSchemaEnums = "Role"\n\nexport type WibeSchemaTypes = {\n  Collection1: Collection1\n}`,
		)
	})

	it("should throw an error if the scalar doesn't exist", async () => {
		const wibe = new WibeApp({
			database: {
				type: DatabaseEnum.Mongo,
				url: 'mongodb://127.0.0.1:27045',
				name: 'Wibe',
			},
			port: 3000,
			schema: {
				class: [
					{
						name: 'User',
						fields: {
							name: {
								// @ts-ignore
								type: 'ScalarThatDoesntExist',
							},
						},
					},
				],
			},
		})

		expect(wibe.start()).rejects.toThrow(
			'ScalarThatDoesntExist not exist in schema',
		)
	})
})
