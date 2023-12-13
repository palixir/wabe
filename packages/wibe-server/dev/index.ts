import { runDatabase } from 'wibe-mongodb-launcher'
import { WibeApp } from '../src'
import { DatabaseEnum } from '../src/database'

const run = async () => {
	await runDatabase()

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
						name: { type: 'String' },
						age: { type: 'Int' },
						isCool: { type: 'Boolean' },
						birthDate: {
							type: 'Date',
							required: true,
						},
						firstName: {
							type: 'Array',
							typeValue: 'String',
							required: true,
						},
						phone: {
							type: 'Phone',
						},
					},
					resolvers: {
						queries: {
							helloWorld: {
								type: 'String',
								args: {
									name: {
										type: 'String',
										required: true,
									},
								},
								resolve: () => 'Hello World',
							},
						},
						mutations: {
							createMutation: {
								type: 'Boolean',
								required: true,
								args: {
									name: {
										type: 'Int',
										required: true,
									},
								},
								resolve: () => true,
							},
						},
					},
				},
				{
					name: 'Address',
					fields: {
						address1: { type: 'String' },
						address2: { type: 'String' },
						postalCode: { type: 'String' },
						city: { type: 'String' },
						country: { type: 'String' },
					},
				},
			],
			scalars: [
				{
					name: 'Phone',
					description: 'Phone custom scalar type',
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
		},
	})

	await wibe.start()
}

run()
