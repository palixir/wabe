// import { describe, expect, it, beforeAll, afterAll } from 'bun:test'
// import { getGraphqlClient, setupTests } from '../utils/helper'
// import { WibeApp } from '../server'
// import { GraphQLClient, gql } from 'graphql-request'

// describe('SignInWith', () => {
// 	let wibe: WibeApp
// 	let port: number
// 	let client: GraphQLClient

// 	beforeAll(async () => {
// 		const setup = await setupTests()
// 		wibe = setup.wibe
// 		port = setup.port
// 		client = getGraphqlClient(port)
// 	})

// 	afterAll(async () => {
// 		await wibe.close()
// 	})

// 	it('should throw an error if no custom authentication configuration is provided', async () => {
// 		const authenticationConfig = WibeApp.config.authentication
// 		WibeApp.config.authentication = undefined

// 		expect(
// 			client.request(graphql.signInWith, {
// 				input: {
// 					emailPassword: {
// 						identifier: 'email@test.fr',
// 						password: 'password',
// 					},
// 				},
// 			}),
// 		).rejects.toThrow('No custom authentication methods found')

// 		WibeApp.config.authentication = authenticationConfig
// 	})

// 	it('should signInWith email and password', async () => {
// 		const res = await client.request(graphql.signInWith, {
// 			input: {
// 				emailPassword: {
// 					identifier: 'email@test.fr',
// 					password: 'password',
// 				},
// 			},
// 		})
// 	})
// })

// const graphql = {
// 	signInWith: gql`
// 		mutation signInWith($input: SignInWithInput!) {
// 			signInWith(input: $input)
// 		}
// 	`,
// }
