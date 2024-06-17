import { beforeAll, afterAll, describe, expect, it } from 'bun:test'
import {
	closeTests,
	getAnonymousClient,
	getGraphqlClient,
	getUserClient,
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

	it('should authorize a connected user to access to protected resource', async () => {
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

		const resOfRoles = await rootClient.request<any>(gql`
			query getRoles {
					_roles(where: {name: {equalTo: "Client"}}) {
			    edges {
		    			node {
		     			 	id
		    			}
		  			}
					}
			}
		`)

		const roleId = resOfRoles._roles.edges[0].node.id

		await rootClient.request<any>(gql`
			mutation updateUser {
			  update_User(input: {id: "${res.signUpWith.id}", fields: {role: {link: "${roleId}"}}}) {
		  			_user {
		    			id
		  			}
					}
			}
		`)

		const userClient = getUserClient(port, res.signUpWith.accessToken)

		const resOfTest = await userClient.request<any>(gql`
			query tests{
				tests {
					edges {
						node {
							id
						}
					}
				}
			}
		`)

		expect(resOfTest.tests.edges.length).toEqual(0)
	})

	it('should not authorize to access to protected resource if the user is not connected', async () => {
		const userClient = getUserClient(port, 'invalidToken')

		expect(
			userClient.request<any>(gql`
			query tests{
				tests {
					edges {
						node {
							id
						}
					}
				}
			}
		`),
		).rejects.toThrow('Permission denied to read class Test')
	})
})

const graphql = {
	signInWith: gql`
		 mutation signInWith($input: SignInWithInput!) {
  		signInWith(input: $input){
  			id
  			accessToken
  			refreshToken
  		}
		}
	`,
	signUpWith: gql`
		 mutation signUpWith($input: SignUpWithInput!) {
  		signUpWith(input:	$input){
  			id
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
