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
		const { findMany_User } = await client.request<any>(
			graphql.findMany_User,
			{},
		)
		await Promise.all(
			findMany_User.objects.map((user: any) =>
				client.request<any>(graphql.deleteOne_User, {
					input: { id: user.id },
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
			findMany_User: { objects },
		} = await client.request<any>(graphql.findMany_User, {
			where: {
				email: {
					equalTo: 'email@test.com',
				},
			},
		})

		expect(objects.length).toEqual(1)
		expect(objects[0].email).toEqual('email@test.com')
		expect(objects[0].accessToken).toEqual('accessToken')
		expect(objects[0].refreshToken).toEqual('refreshToken')
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
			findMany_User: { objects },
		} = await client.request<any>(graphql.findMany_User, {
			where: {
				email: {
					equalTo: 'email@test.com',
				},
			},
		})

		expect(objects.length).toEqual(1)
		expect(objects[0].email).toEqual('email@test.com')
		expect(objects[0].accessToken).toEqual('accessToken2')
		expect(objects[0].refreshToken).toEqual('refreshToken2')
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
		mutation createManyUser($input: UsersCreateInput!) {
			createManyUser(input: $input) {
				objects{
					name
					age
				}
			}
		}
	`,
	createOne_User: gql`
        mutation createOne_User($input: _UserCreateInput!) {
            createOne_User(input: $input) {
                id
            }
        }
    `,
	findMany_User: gql`
        query findMany_User($where: _UserWhereInput) {
            findMany_User(where: $where) {
                objects {
                    id
                    email
                    accessToken
                    refreshToken
                }
            }
        }
    `,
	signInWithProvider: gql`
        mutation signInWithProvider(
            $input: SignInWithProviderInput!
        ) {
            signInWithProvider(
                input: $input
            )
        }
    `,
	deleteOne_User: gql`
        mutation deleteOne_User($input: _UserDeleteInput!) {
            deleteOne_User(input: $input) {
                id
            }
        }
    `,
}
