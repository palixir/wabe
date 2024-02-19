import { describe, expect, it, beforeAll, afterAll } from 'bun:test'
import { getGraphqlClient, setupTests } from '../utils/helper'
import { WibeApp } from '../server'
import { GraphQLClient, gql } from 'graphql-request'

describe('SignInWith', () => {
	let wibe: WibeApp
	let port: number
	let client: GraphQLClient

	beforeAll(async () => {
		const setup = await setupTests()
		wibe = setup.wibe
		port = setup.port
		client = getGraphqlClient(port)
	})

	afterAll(async () => {
		await wibe.close()
	})

	it('should signInWith email and password', async () => {
		const res = await client.request(graphql.signInWith, {
			input: {
				emailPassword: {
					email: 'email@test.fr',
					password: 'password',
				},
			},
		})
	})
})

const graphql = {
	signInWith: gql`
		mutation signInWith($input: SignInWithInput!) {
			signInWith(input: $input)
		}
	`,
}
