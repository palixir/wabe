import { beforeAll, afterAll, describe, expect, it, afterEach } from 'bun:test'
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

	afterEach(async () => {
		await rootClient.request<any>(graphql.delete_Users)
	})

	it('should authorize a connected user to access to a protected resource', async () => {
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

	it('should authorize a connected user to access to protected resource after the user refresh his token', async () => {
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

		const resAfterRefresh = await userClient.request<any>(graphql.refresh, {
			input: {
				accessToken: res.signUpWith.accessToken,
				refreshToken: res.signUpWith.refreshToken,
			},
		})

		const userClientAfterRefresh = getUserClient(
			port,
			resAfterRefresh.refresh.accessToken,
		)

		const resOfTest = await userClientAfterRefresh.request<any>(gql`
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

	it("should not authorize to access to protected resource if the user doesn't had an authorized role", async () => {
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
					_roles(where: {name: {equalTo: "Client2"}}) {
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

	it('should not authorize to delete a test object to an user that have the right to read the same class', async () => {
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

		expect(
			userClient.request<any>(gql`
			mutation deleteTests{
				deleteTests(input: {where: {name: {equalTo: "test"}}}) {
					edges {
						node {
							id
						}
					}
				}
			}
		`),
		).rejects.toThrow('Permission denied to delete class Test')
	})
})

const graphql = {
	delete_Users: gql`
		mutation delete_User {
  		delete_Users(
    		input: {where: {authentication: {emailPassword: {email: {equalTo: "email@test.fr"}}}}}
  		) {
    		edges {
      		node {
        		id
      		}
    		}
  		}
		}
	`,
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
	refresh: gql`
		mutation refresh($input: RefreshInput) {
  		refresh(input: $input) {
    		accessToken
    		refreshToken
  		}
		}
	`,
}
