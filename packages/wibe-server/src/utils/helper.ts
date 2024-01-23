import { v4 as uuid } from 'uuid'
import { GraphQLClient } from 'graphql-request'
import { WibeApp } from '../server'
import { DatabaseEnum } from '../database'
import getPort from 'get-port'

export const getGraphqlClient = (port: number): GraphQLClient => {
	const client = new GraphQLClient(`http://127.0.0.1:${port}/graphql`)

	return { ...client, request: client.request<any> } as GraphQLClient
}

export const setupTests = async () => {
	const databaseId = uuid()

	const port = await getPort()

	const wibe = new WibeApp({
		database: {
			type: DatabaseEnum.Mongo,
			url: 'mongodb://127.0.0.1:27045',
			name: databaseId,
		},
		port,
		schema: {
			class: [
				{
					name: 'User',
					fields: {
						name: { type: 'String', required: true },
						age: { type: 'Int' },
						isAdmin: { type: 'Boolean' },
						floatValue: { type: 'Float' },
						birthDate: { type: 'Date' },
						arrayValue: {
							type: 'Array',
							typeValue: 'String',
						},
						phone: {
							type: 'Phone',
						},
						email: {
							type: 'Email',
						},
						role: {
							type: 'Role',
							defaultValue: 'Member',
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
							customQuery: {
								type: 'String',
								args: {
									name: {
										type: 'String',
										required: true,
									},
								},
								resolve: () => 'Successfull',
							},
						},
						mutations: {
							customMutation: {
								type: 'Int',
								args: {
									a: {
										type: 'Int',
										required: true,
									},
									b: {
										type: 'Int',
										required: true,
									},
								},
								resolve: (root: any, args: any) =>
									args.a + args.b,
							},
						},
					},
				},
			],
			scalars: [
				{
					name: 'Phone',
					description: 'Phone scalar',
				},
			],
			enums: [
				{
					name: 'AuthenticationProvider',
					values: {
						GOOGLE: 'GOOGLE',
						X: 'X',
					},
				},
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

	return { wibe, port }
}

export const closeTests = async (wibe: WibeApp) => {
	await WibeApp.databaseController.adapter?.close()
	await wibe.close()
}
