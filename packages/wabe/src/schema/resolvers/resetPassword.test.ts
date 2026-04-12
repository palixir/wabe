import { describe, it, afterAll, beforeAll, expect, beforeEach } from 'bun:test'
import { gql, type GraphQLClient } from 'graphql-request'
import {
	type DevWabeTypes,
	getAnonymousClient,
	getGraphqlClient,
	getUserClient,
} from '../../utils/helper'
import { setupTests, closeTests } from '../../utils/testHelper'
import type { Wabe } from '../../server'
import { OTP, getOrCreateOtpSalt } from 'src'

describe('resetPasswordResolver', () => {
	let wabe: Wabe<DevWabeTypes>
	let port: number
	let client: GraphQLClient

	beforeAll(async () => {
		const setup = await setupTests()
		wabe = setup.wabe
		port = setup.port
		client = getGraphqlClient(port)
	})

	afterAll(async () => {
		await closeTests(wabe)
	})

	beforeEach(async () => {
		await wabe.controllers.database.clearDatabase()
	})

	const makeRootContext = () =>
		({
			isRoot: true,
			wabe: { controllers: wabe.controllers, config: wabe.config },
		}) as any

	it('should let an anonymous reset the password of an user', async () => {
		process.env.NODE_ENV = 'production'

		const anonymousClient = getAnonymousClient(port)

		await anonymousClient.request<any>(graphql.createUser, {
			input: {
				fields: {
					authentication: {
						emailPassword: {
							email: 'toto@toto.fr',
							password: 'totototo',
						},
					},
				},
			},
		})

		const {
			users: { edges },
		} = await getGraphqlClient(port).request<any>(gql`
			query users {
				users(where: { email: { equalTo: "toto@toto.fr" } }) {
					edges {
						node {
							id
						}
					}
				}
			}
		`)

		const userId = edges[0].node.id

		const otp = new OTP(wabe.config.rootKey)
		const salt = await getOrCreateOtpSalt(makeRootContext(), userId)

		await anonymousClient.request<any>(graphql.resetPassword, {
			input: {
				email: 'toto@toto.fr',
				password: 'tata',
				otp: otp.generate(userId, salt),
			},
		})

		const res = await anonymousClient.request<any>(graphql.signInWith, {
			input: {
				authentication: {
					emailPassword: {
						email: 'toto@toto.fr',
						password: 'tata',
					},
				},
			},
		})

		expect(res.signInWith.user.id).toEqual(userId)

		process.env.NODE_ENV = 'test'
	})

	it('should reset password of an user if the OTP code is valid', async () => {
		process.env.NODE_ENV = 'production'

		const {
			createUser: { user },
		} = await client.request<any>(graphql.createUserWithRoot, {
			input: {
				fields: {
					authentication: {
						emailPassword: {
							email: 'toto@toto.fr',
							password: 'totototo',
						},
					},
				},
			},
		})

		const userId = user.id

		const otp = new OTP(wabe.config.rootKey)
		const salt = await getOrCreateOtpSalt(makeRootContext(), userId)

		await client.request<any>(graphql.resetPassword, {
			input: {
				email: 'toto@toto.fr',
				password: 'tata',
				otp: otp.generate(userId, salt),
			},
		})

		const res = await client.request<any>(graphql.signInWith, {
			input: {
				authentication: {
					emailPassword: {
						email: 'toto@toto.fr',
						password: 'tata',
					},
				},
			},
		})

		expect(res.signInWith.user.id).toEqual(userId)

		process.env.NODE_ENV = 'test'
	})

	it('should revoke active sessions after password reset', async () => {
		process.env.NODE_ENV = 'production'

		const {
			createUser: { user },
		} = await client.request<any>(graphql.createUserWithRoot, {
			input: {
				fields: {
					authentication: {
						emailPassword: {
							email: 'session-reset@toto.fr',
							password: 'totototo',
						},
					},
				},
			},
		})

		const userId = user.id
		const otp = new OTP(wabe.config.rootKey)
		const salt = await getOrCreateOtpSalt(makeRootContext(), userId)

		const signInRes = await client.request<any>(graphql.signInWith, {
			input: {
				authentication: {
					emailPassword: {
						email: 'session-reset@toto.fr',
						password: 'totototo',
					},
				},
			},
		})

		const oldAccessToken = signInRes.signInWith.accessToken
		expect(oldAccessToken).toBeDefined()

		await client.request<any>(graphql.resetPassword, {
			input: {
				email: 'session-reset@toto.fr',
				password: 'tata',
				otp: otp.generate(userId, salt),
			},
		})

		const meWithOldAccessToken = await getUserClient(port, {
			accessToken: oldAccessToken,
		}).request<any>(gql`
			query me {
				me {
					user {
						id
					}
				}
			}
		`)

		expect(meWithOldAccessToken.me.user).toBeNull()

		const sessions = await client.request<any>(gql`
			query sessions {
				_sessions(where: { user: { id: { equalTo: "${userId}" } } }) {
					totalCount
				}
			}
		`)

		expect(sessions._sessions.totalCount).toEqual(0)

		const res = await client.request<any>(graphql.signInWith, {
			input: {
				authentication: {
					emailPassword: {
						email: 'session-reset@toto.fr',
						password: 'tata',
					},
				},
			},
		})

		expect(res.signInWith.user.id).toEqual(userId)

		process.env.NODE_ENV = 'test'
	})

	it('should reset password in dev mode with valid normal code', async () => {
		process.env.NODE_ENV = 'test'

		const {
			createUser: { user },
		} = await client.request<any>(graphql.createUserWithRoot, {
			input: {
				fields: {
					authentication: {
						emailPassword: {
							email: 'toto@toto.fr',
							password: 'totototo',
						},
					},
				},
			},
		})

		const userId = user.id

		const otp = new OTP(wabe.config.rootKey)
		const salt = await getOrCreateOtpSalt(makeRootContext(), userId)

		await client.request<any>(graphql.resetPassword, {
			input: {
				email: 'toto@toto.fr',
				password: 'tata',
				otp: otp.generate(userId, salt),
			},
		})

		const res = await client.request<any>(graphql.signInWith, {
			input: {
				authentication: {
					emailPassword: {
						email: 'toto@toto.fr',
						password: 'tata',
					},
				},
			},
		})

		expect(res.signInWith.user.id).toEqual(userId)
	})

	it('should reject reset password with code 000000', async () => {
		process.env.NODE_ENV = 'test'

		const {
			createUser: { user },
		} = await client.request<any>(graphql.createUserWithRoot, {
			input: {
				fields: {
					authentication: {
						emailPassword: {
							email: 'toto2@toto.fr',
							password: 'totototo',
						},
					},
				},
			},
		})

		const userId = user.id

		await expect(
			client.request<any>(graphql.resetPassword, {
				input: {
					email: 'toto2@toto.fr',
					password: 'tata',
					otp: '000000',
				},
			}),
		).rejects.toThrow('Invalid OTP code')

		const res = await client.request<any>(graphql.signInWith, {
			input: {
				authentication: {
					emailPassword: {
						email: 'toto2@toto.fr',
						password: 'totototo',
					},
				},
			},
		})

		expect(res.signInWith.user.id).toEqual(userId)
	})

	it("should return true if the user doesn't exist (hide sensitive data)", async () => {
		process.env.NODE_ENV = 'test'

		const res = await client.request<any>(graphql.resetPassword, {
			input: {
				email: 'invalidUser@toto.fr',
				password: 'tata',
				otp: '000000',
			},
		})

		expect(res.resetPassword).toEqual(true)
	})

	it('should not reset password of an user if the OTP code is invalid', async () => {
		process.env.NODE_ENV = 'production'

		await client.request<any>(graphql.createUserWithRoot, {
			input: {
				fields: {
					authentication: {
						emailPassword: {
							email: 'toto3@toto.fr',
							password: 'totototo',
						},
					},
				},
			},
		})

		expect(
			client.request<any>(graphql.resetPassword, {
				input: {
					email: 'toto3@toto.fr',
					password: 'tata',
					otp: 'invalidOtp',
				},
			}),
		).rejects.toThrow('Invalid OTP code')

		process.env.NODE_ENV = 'test'
	})

	it('should reset password of another provider than emailPassword', async () => {
		process.env.NODE_ENV = 'production'

		const {
			createUser: { user },
		} = await client.request<any>(graphql.createUserWithRoot, {
			input: {
				fields: {
					authentication: {
						phonePassword: {
							phone: '+33600000000',
							password: 'totototo',
						},
					},
				},
			},
		})

		const userId = user.id

		const otp = new OTP(wabe.config.rootKey)
		const salt = await getOrCreateOtpSalt(makeRootContext(), userId)

		await client.request<any>(graphql.resetPassword, {
			input: {
				phone: '+33600000000',
				password: 'tata',
				otp: otp.generate(userId, salt),
			},
		})

		const res = await client.request<any>(graphql.signInWith, {
			input: {
				authentication: {
					phonePassword: {
						phone: '+33600000000',
						password: 'tata',
					},
				},
			},
		})

		expect(res.signInWith.user.id).toEqual(userId)

		process.env.NODE_ENV = 'test'
	})

	it('should rate limit reset password attempts after repeated invalid OTPs', async () => {
		const previousSecurity = wabe.config.authentication?.security
		wabe.config.authentication = {
			...wabe.config.authentication,
			security: {
				...previousSecurity,
				resetPasswordRateLimit: {
					enabled: true,
					maxAttempts: 1,
					windowMs: 60_000,
					blockDurationMs: 60_000,
				},
			},
		}

		const email = 'ratelimit-reset@toto.fr'
		try {
			await client.request<any>(graphql.createUserWithRoot, {
				input: {
					fields: {
						authentication: {
							emailPassword: {
								email,
								password: 'totototo',
							},
						},
					},
				},
			})

			await expect(
				client.request<any>(graphql.resetPassword, {
					input: {
						email,
						password: 'newPassword',
						otp: 'invalidOtp',
					},
				}),
			).rejects.toThrow('Invalid OTP code')

			await expect(
				client.request<any>(graphql.resetPassword, {
					input: {
						email,
						password: 'newPassword',
						otp: 'invalidOtp',
					},
				}),
			).rejects.toThrow('Too many attempts. Please try again later.')
		} finally {
			wabe.config.authentication = {
				...wabe.config.authentication,
				security: previousSecurity,
			}
		}
	})
})

const graphql = {
	signInWith: gql`
		mutation signInWith($input: SignInWithInput!) {
			signInWith(input: $input) {
				accessToken
				refreshToken
				user {
					id
				}
			}
		}
	`,
	createUser: gql`
		mutation createUser($input: CreateUserInput!) {
			createUser(input: $input) {
				ok
			}
		}
	`,
	createUserWithRoot: gql`
		mutation createUser($input: CreateUserInput!) {
			createUser(input: $input) {
				user {
					id
				}
			}
		}
	`,
	resetPassword: gql`
		mutation resetPassword($input: ResetPasswordInput!) {
			resetPassword(input: $input)
		}
	`,
}
