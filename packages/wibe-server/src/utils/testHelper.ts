import { runDatabase } from 'wibe-mongodb-launcher'
import { MongoAdapter } from '../database/adapters/MongoAdapter'
import { GraphQLClient } from 'graphql-request'

let mongoAdapter: MongoAdapter | undefined = undefined

export const getMongoAdapter = async () => {
	if (mongoAdapter) return mongoAdapter

	const port = await runDatabase()

	mongoAdapter = new MongoAdapter({
		databaseUrl: `mongodb://127.0.0.1:${port}`,
		databaseName: 'test',
	})

	await mongoAdapter.connect()

	return mongoAdapter
}

export const getGraphqlClient = (port: number) => {
	const client = new GraphQLClient(`http://127.0.0.1:${port}/graphql`)

	return { ...client, request: client.request<any> }
}
