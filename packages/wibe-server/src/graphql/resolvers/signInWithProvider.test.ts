import { describe, it, expect, beforeAll, afterAll, afterEach } from 'bun:test'
import { WibeApp } from '../../server'
import { GraphQLClient, gql } from 'graphql-request'
import { getGraphqlClient, setupTests } from '../../utils/helper'
import { AuthenticationProvider } from '../../../generated/wibe'

describe('signInWithProvider', () => {
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

	afterEach(async () => {
		const { _users } = await client.request<any>(graphql._users, {})
		await Promise.all(
			_users.edges.map(({ node }: { node: any }) =>
				client.request<any>(graphql.delete_User, {
					input: { id: node.id },
				}),
			),
		)
	})

	it('should create an user if not exist', async () => {
		const { signInWithProvider } = await client.request<any>(
			graphql.signInWithProvider,
			{
				input: {
					email: 'email@test.com',
					verifiedEmail: true,
					provider: AuthenticationProvider.Google,
					refreshToken: 'refreshToken',
					accessToken: 'accessToken',
				},
			},
		)

		expect(signInWithProvider).toEqual(true)

		const {
			_users: { edges },
		} = await client.request<any>(graphql._users, {
			where: {
				email: {
					equalTo: 'email@test.com',
				},
			},
		})

		expect(edges.length).toEqual(1)
		expect(edges[0].node.email).toEqual('email@test.com')
		expect(edges[0].node.accessToken).toEqual('accessToken')
		expect(edges[0].node.refreshToken).toEqual('refreshToken')
	})

	it('should update the authentication field of an _User if the _User already exist', async () => {
		const { signInWithProvider } = await client.request<any>(
			graphql.signInWithProvider,
			{
				input: {
					email: 'email@test.com',
					verifiedEmail: true,
					refreshToken: 'refreshToken',
					accessToken: 'accessToken',
					provider: AuthenticationProvider.Google,
				},
			},
		)

		expect(signInWithProvider).toEqual(true)

		const { signInWithProvider: signInWithProvider2 } =
			await client.request<any>(graphql.signInWithProvider, {
				input: {
					email: 'email@test.com',
					verifiedEmail: true,
					refreshToken: 'refreshToken2',
					accessToken: 'accessToken2',
					provider: AuthenticationProvider.Google,
				},
			})

		expect(signInWithProvider2).toEqual(true)

		const {
			_users: { edges },
		} = await client.request<any>(graphql._users, {
			where: {
				email: {
					equalTo: 'email@test.com',
				},
			},
		})

		expect(edges.length).toEqual(1)
		expect(edges[0].node.email).toEqual('email@test.com')
		expect(edges[0].node.accessToken).toEqual('accessToken2')
		expect(edges[0].node.refreshToken).toEqual('refreshToken2')
	})

	it('should throw an error if the email is not verified', async () => {
		expect(
			client.request<any>(graphql.signInWithProvider, {
				input: {
					email: 'email@test.com',
					verifiedEmail: false,
					refreshToken: 'refreshToken',
					accessToken: 'accessToken',
					provider: AuthenticationProvider.Google,
				},
			}),
		).rejects.toThrow('Email not verified')
	})
})

const graphql = {
	createManyUser: gql`
        mutation createManyUser($input: _UsersCreateInput!) {
            createManyUser(input: $input) {
                edges {
                    node {
                        name
                        age
                    }
                }
            }
        }
    `,
	create_User: gql`
        mutation create_User($input: _UserCreateInput!) {
            create_User(input: $input) {
                id
            }
        }
    `,
	_users: gql`
        query _users($where: _UserWhereInput) {
            _users(where: $where) {
                edges {
                    node {
                        id
                        email
                        accessToken
                        refreshToken
                    }
                }
            }
        }
    `,
	signInWithProvider: gql`
        mutation signInWithProvider($input: SignInWithProviderInput!) {
            signInWithProvider(input: $input)
        }
    `,
	delete_User: gql`
        mutation delete_User($input: _UserDeleteInput!) {
            delete_User(input: $input) {
                id
            }
        }
    `,
}
