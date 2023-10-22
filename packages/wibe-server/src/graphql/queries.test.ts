import { afterAll, beforeAll, describe, expect, it } from 'bun:test'
import { WibeApp } from '../server'
import { gql } from '@elysiajs/apollo'
import { getGraphqlClient, setupTests } from '../utils/testHelper'

describe('GraphQL Queries', () => {
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

	it('should call getObject with default query', async () => {
		const client = getGraphqlClient(port)

		expect(async () => await client.request(graphql.user, {})).toThrow(
			'Object not found',
		)
	})
})

const graphql = {
	user: gql`
		query user {
			user(id: "65356f69ea1fe46431076723") {
				name
				age
			}
		}
	`,
}
