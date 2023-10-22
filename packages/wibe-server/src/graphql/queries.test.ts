import { afterAll, beforeAll, describe, expect, it, spyOn } from 'bun:test'
import getPort from 'get-port'
import { GraphQLClient } from 'graphql-request'
import { WibeApp } from '../server'
import { DatabaseEnum } from '../database'
import { gql } from '@elysiajs/apollo'
import { DatabaseController } from '../database/controllers/DatabaseController'
import { getGraphqlClient, getMongoAdapter } from '../utils/testHelper'
import { MongoAdapter } from '../database/adapters/MongoAdapter'

const mockDatabaseController = spyOn(
	DatabaseController.prototype,
	'getObject',
).mockResolvedValue({ name: 'John', age: 20 } as any)

describe('GraphQL Queries', () => {
	let wibe: WibeApp
	let port: number
	let mongoAdapter: MongoAdapter

	beforeAll(async () => {
		port = await getPort()

		mongoAdapter = await getMongoAdapter()

		wibe = new WibeApp({
			database: {
				type: DatabaseEnum.Mongo,
				url: mongoAdapter.options.databaseUrl,
				name: mongoAdapter.options.databaseName,
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
	})

	afterAll(async () => {
		await wibe.close()
		await mongoAdapter.close()
	})

	it('should call getObject with default query', async () => {
		const client = getGraphqlClient(port)

		const res = await client.request(graphql.user, {})

		expect(res.user).toBeNull()
	})
})

const graphql = {
	user: gql`
		query user {
			user(id: "123") {
				name
				age
			}
		}
	`,
}
