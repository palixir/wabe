import { v4 as uuid } from 'uuid'
import { GraphQLClient } from 'graphql-request'
import { WibeApp } from '../server'
import { DatabaseEnum } from '../database'
import getPort from 'get-port'

export const getGraphqlClient = (port: number) => {
	const client = new GraphQLClient(`http://127.0.0.1:${port}/graphql`)

	return { ...client, request: client.request<any> }
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
				fields: { name: { type: 'String' }, age: { type: 'Int' } },
			},
		],
	})

	await wibe.start()

	return { wibe, port }
}

export const closeTests = async (wibe: WibeApp) => {
	await wibe.databaseController.adapter?.close()
	await wibe.close()
}
