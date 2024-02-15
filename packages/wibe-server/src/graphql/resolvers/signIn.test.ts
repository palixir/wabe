import {
	describe,
	expect,
	it,
	beforeAll,
	afterAll,
	beforeEach,
	afterEach,
	spyOn,
} from 'bun:test'
import { GraphQLClient, gql } from 'graphql-request'
import { Cookie } from 'elysia'
import { WibeApp } from '../../server'
import { getGraphqlClient, setupTests } from '../../utils/helper'

describe('SignIn', () => {
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

	beforeEach(async () => {
		const hashedPassword = await Bun.password.hash('passwordtest', {
			algorithm: 'argon2id', // OWASP recommandation
			memoryCost: 20000, // OWASP recommands minimum 19MB
			timeCost: 2, // OWASP recommands minimum 2 iterations
		})

		await client.request<any>(graphql.create_User, {
			input: {
				fields: {
					email: 'email@test.fr',
					password: hashedPassword,
				},
			},
		})
	})

	afterEach(async () => {
		const { _users } = await client.request<any>(graphql._users, {
			where: {
				email: { equalTo: 'email@test.fr' },
			},
		})

		await Promise.all(
			_users.edges.map(({ node }: { node: any }) =>
				client.request<any>(graphql.delete_User, {
					input: { id: node.id },
				}),
			),
		)
	})

	it('should be able to sign in', async () => {
		const spySetCookie = spyOn(Cookie.prototype, 'add')

		const { signIn } = await client.request<any>(graphql.signIn, {
			input: {
				email: 'email@test.fr',
				password: 'passwordtest',
			},
		})

		const {
			_users: { edges },
		} = await client.request<any>(graphql._users, {
			where: {
				email: { equalTo: 'email@test.fr' },
			},
		})

		expect(signIn).toEqual(true)

		expect(edges.length).toEqual(1)
		expect(edges[0].node.email).toEqual('email@test.fr')
		expect(edges[0].node.accessToken).toEqual(expect.any(String))
		expect(edges[0].node.refreshToken).toEqual(expect.any(String))

		// For the moment we dont' check the jwt sign of the access and refresh token
		// the jwt is in the context and we can't access it

		expect(spySetCookie).toHaveBeenCalledTimes(2)
		expect(spySetCookie).toHaveBeenNthCalledWith(1, {
			expires: expect.any(Date),
			httpOnly: true,
			path: '/',
			value: expect.any(String),
			sameSite: 'strict',
			secure: false,
		})

		expect(spySetCookie).toHaveBeenNthCalledWith(2, {
			expires: expect.any(Date),
			httpOnly: true,
			path: '/',
			value: expect.any(String),
			sameSite: 'strict',
			secure: false,
		})

		spySetCookie.mockReset()
	})

	it('should not be able to sign in', async () => {
		const spySetCookie = spyOn(Cookie.prototype, 'add')

		expect(
			client.request<any>(graphql.signIn, {
				input: {
					email: 'email@test.fr',
					password: 'badpassword',
				},
			}),
		).rejects.toThrow('User not found')

		expect(spySetCookie).toHaveBeenCalledTimes(0)

		expect(
			client.request<any>(graphql.signIn, {
				input: {
					email: 'bademail@test.fr',
					password: 'passwordtest',
				},
			}),
		).rejects.toThrow('User not found')

		expect(spySetCookie).toHaveBeenCalledTimes(0)
	})
})

const graphql = {
	signIn: gql`
        mutation signIn($input: SignInInput!) {
            signIn(input: $input)
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
	delete_User: gql`
        mutation delete_User($input: _UserDeleteInput!) {
            delete_User(input: $input) {
                id
            }
        }
    `,
}
