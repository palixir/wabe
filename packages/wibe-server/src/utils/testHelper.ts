import { v4 as uuid } from 'uuid'
import { GraphQLClient } from 'graphql-request'
import { WibeApp } from '../server'
import { DatabaseEnum } from '../database'
import getPort from 'get-port'
import { WibeSchemaType } from '../schema/Schema'

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
			url: `mongodb://127.0.0.1:27045`,
			name: databaseId,
		},
		port,
		schema: [
			{
				name: 'User',
				fields: {
					name: { type: WibeSchemaType.String, required: true },
					age: { type: WibeSchemaType.Int },
					isAdmin: { type: WibeSchemaType.Boolean },
					floatValue: { type: WibeSchemaType.Float },
					birthDate: { type: WibeSchemaType.Date },
					arrayValue: {
						type: WibeSchemaType.Array,
						typeValue: WibeSchemaType.String,
					},
				},
			},
		],
	})

	await wibe.start()

	return { wibe, port }
}

export const closeTests = async (wibe: WibeApp) => {
	await WibeApp.databaseController.adapter?.close()
	await wibe.close()
}
