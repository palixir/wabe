import { beforeAll, afterAll, describe, expect, it } from 'bun:test'
import {
	closeTests,
	getAnonymousClient,
	getGraphqlClient,
	setupTests,
} from '../utils/helper'
import type { WibeApp } from '..'
import { gql, type GraphQLClient } from 'graphql-request'

describe('Authentication', () => {
	let wibe: WibeApp
	let port: number
	let client: GraphQLClient
	let rootClient: GraphQLClient

	beforeAll(async () => {
		const setup = await setupTests()
		wibe = setup.wibe
		port = setup.port
		client = getAnonymousClient(port)
		rootClient = getGraphqlClient(port)
	})

	afterAll(async () => {
		await closeTests(wibe)
	})

	it('should authorize a connected user to access to user schema (protected by default)', async () => {
		const res = await client.request<any>(graphql.signUpWith, {
			input: {
				authentication: {
					emailPassword: {
						email: 'email@test.fr',
						password: 'password',
					},
				},
			},
		})

		// const resUsers = await rootClient.request<any>(gql`
		// 		query _users {
		// 			_users {
		// 				edges {
		// 					node {
		// 						id
		// 					}
		// 				}
		// 			}
		// 		}
		// 	`)
	})
})

const graphql = {
	signInWith: gql`
		 mutation signInWith($input: SignInWithInput!) {
  		signInWith(input: $input){
  			accessToken
  			refreshToken
  		}
		}
	`,
	signUpWith: gql`
		 mutation signUpWith($input: SignUpWithInput!) {
  		signUpWith(input:	$input){
  			accessToken
  			refreshToken
  		}
  	}
	 `,
	signOut: gql`
		 mutation signOut {
			signOut
		}
	`,
}
