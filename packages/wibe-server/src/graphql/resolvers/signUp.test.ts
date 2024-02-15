import {
	describe,
	expect,
	it,
	beforeAll,
	afterAll,
	afterEach,
	spyOn,
} from 'bun:test'
import { Cookie } from 'elysia'
import { GraphQLClient, gql } from 'graphql-request'
import { getGraphqlClient, setupTests } from '../../utils/helper'
import { WibeApp } from '../../server'

describe('SignUp', () => {
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

	it('should be able to signUp an user', async () => {
		const spySetCookie = spyOn(Cookie.prototype, 'add')

		const { signUp } = await client.request<any>(graphql.signUp, {
			input: {
				email: 'email@test.fr',
				password: 'passwordtest',
			},
		})

		expect(signUp).toEqual(true)

		const { _users: users } = await client.request<any>(graphql._users, {
			where: {
				email: { equalTo: 'email@test.fr' },
			},
		})

		const isPasswordEquals = await Bun.password.verify(
			'passwordtest',
			users.edges[0].node.password,
			'argon2id',
		)

		expect(users.edges.length).toEqual(1)
		expect(users.edges[0].node.email).toEqual('email@test.fr')
		expect(isPasswordEquals).toEqual(true)

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

	it('should not be able to signUp an user with an email already exist', async () => {
		const spySetCookie = spyOn(Cookie.prototype, 'add')

		const { signUp } = await client.request<any>(graphql.signUp, {
			input: {
				email: 'email@test.fr',
				password: 'passwordtest',
			},
		})

		expect(signUp).toEqual(true)

		spySetCookie.mockReset()

		expect(
			client.request<any>(graphql.signUp, {
				input: {
					email: 'email@test.fr',
					password: 'passwordtest',
				},
			}),
		).rejects.toThrow('User already exist')

		expect(spySetCookie).toHaveBeenCalledTimes(0)
	})
})

const graphql = {
	_users: gql`
        query _users($where: _UserWhereInput) {
            _users(where: $where) {
                edges {
                    node {
                        id
                        email
                        password
                        accessToken
                        refreshToken
                    }
                }
            }
        }
    `,
	signUp: gql`
        mutation signUp($input: SignUpInput!) {
            signUp(input: $input)
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
