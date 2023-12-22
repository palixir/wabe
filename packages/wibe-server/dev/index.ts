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
						name: { type: 'String', required: true },
						age: { type: 'Int' },
						isCool: { type: 'Boolean' },
						birthDate: {
							type: 'Date',
							required: true,
						},
						phone: {
							type: 'Phone',
						},
						role: {
							type: 'Role',
						},
						address: {
							type: 'Object',
							object: {
								name: 'Address',
								fields: {
									address1: {
										type: 'String',
									},
									address2: {
										type: 'String',
									},
									postalCode: {
										type: 'Int',
									},
									city: {
										type: 'String',
									},
									country: {
										type: 'String',
									},
								},
							},
						},
						object: {
							type: 'Object',
							object: {
								name: 'Object',
								fields: {
									objectOfObject: {
										type: 'Object',
										object: {
											name: 'ObjectOfObject',
											fields: {
												name: {
													type: 'String',
												},
											},
										},
									},
								},
							},
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
						Admin: 'Admin',
						Member: 'Member',
					},
				},
			],
		},
	})

	await wibe.start()
}

run()
