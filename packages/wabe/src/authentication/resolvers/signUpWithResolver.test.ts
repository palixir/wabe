import { afterAll, beforeAll, beforeEach, describe, expect, it, spyOn } from 'bun:test'
import { gql } from 'graphql-request'
import { EmailPassword } from '../providers/EmailPassword'
import type { Wabe } from '../../server'
import { verifyArgon2 } from '../../utils/crypto'
import { contextWithRoot } from '../../utils/export'
import { type DevWabeTypes, getAnonymousClient } from '../../utils/helper'
import { closeTests, setupTests } from '../../utils/testHelper'

const signUpWithEmailPasswordMutation = gql`
	mutation signUpWith($input: SignUpWithInput!) {
		signUpWith(input: $input) {
			id
			accessToken
			refreshToken
		}
	}
`

describe('SignUpWith', () => {
	let wabe: Wabe<DevWabeTypes>

	beforeAll(async () => {
		const setup = await setupTests()
		wabe = setup.wabe
	})

	beforeEach(async () => {
		await wabe.controllers.database.clearDatabase()
	})

	afterAll(async () => {
		await closeTests(wabe)
	})

	it('should throw an error if user already exist with emailPassword', async () => {
		const anonymousClient = getAnonymousClient(wabe.config.port)

		await anonymousClient.request<any>(
			gql`
				mutation signUpWith($input: SignUpWithInput!) {
					signUpWith(input: $input) {
						id
					}
				}
			`,
			{
				input: {
					authentication: {
						emailPassword: {
							email: 'test@gmail.com',
							password: 'password',
						},
					},
				},
			},
		)

		expect(
			anonymousClient.request<any>(
				gql`
					mutation signUpWith($input: SignUpWithInput!) {
						signUpWith(input: $input) {
							id
						}
					}
				`,
				{
					input: {
						authentication: {
							emailPassword: {
								email: 'test@gmail.com',
								password: 'password',
							},
						},
					},
				},
			),
		).rejects.toThrow('Not authorized to create user')
	})

	it('should throw an error if the signUp is disabled', () => {
		if (wabe.config) {
			wabe.config.authentication = {
				...wabe.config.authentication,
				disableSignUp: true,
			}
		}
		const anonymousClient = getAnonymousClient(wabe.config.port)

		const userSchema = wabe.config.schema?.classes?.find((classItem) => classItem.name === 'User')

		if (!userSchema) throw new Error('Failed to find user schema')

		// @ts-expect-error
		userSchema.permissions.create.requireAuthentication = true

		expect(
			anonymousClient.request<any>(
				gql`
					mutation signUpWith($input: SignUpWithInput!) {
						signUpWith(input: $input) {
							id
						}
					}
				`,
				{
					input: {
						authentication: {
							emailPassword: {
								email: 'email@test.fr',
								password: 'password',
							},
						},
					},
				},
			),
		).rejects.toThrow('SignUp is disabled')

		if (wabe.config) {
			wabe.config.authentication = {
				...wabe.config.authentication,
				disableSignUp: false,
			}
		}
	})

	it('should block the signUpWith if the user creation is blocked for anonymous (the creation is done with root to avoid ACL issues)', () => {
		const anonymousClient = getAnonymousClient(wabe.config.port)

		const userSchema = wabe.config.schema?.classes?.find((classItem) => classItem.name === 'User')

		if (!userSchema) throw new Error('Failed to find user schema')

		// @ts-expect-error
		userSchema.permissions.create.requireAuthentication = true

		expect(
			anonymousClient.request<any>(
				gql`
					mutation signUpWith($input: SignUpWithInput!) {
						signUpWith(input: $input) {
							id
						}
					}
				`,
				{
					input: {
						authentication: {
							emailPassword: {
								email: 'email@test.fr',
								password: 'password',
							},
						},
					},
				},
			),
		).rejects.toThrow('Permission denied to create class User')

		// @ts-expect-error
		userSchema.permissions.create.requireAuthentication = false
	})

	it('should signUpWith email and password when the user not exist', async () => {
		const anonymousClient = getAnonymousClient(wabe.config.port)

		const res = await anonymousClient.request<any>(signUpWithEmailPasswordMutation, {
			input: {
				authentication: {
					emailPassword: {
						email: 'test@gmail.com',
						password: 'password',
					},
				},
			},
		})

		expect(res.signUpWith.id).toEqual(expect.any(String))
		expect(res.signUpWith.accessToken).toEqual(expect.any(String))
		expect(res.signUpWith.refreshToken).toEqual(expect.any(String))
	})

	it('should call onSignUp only once via signUpWith and still hash the password', async () => {
		const spyOnSignUp = spyOn(EmailPassword.prototype, 'onSignUp')
		const email = 'signup-once@test.fr'
		const password = 'password'
		const anonymousClient = getAnonymousClient(wabe.config.port)

		try {
			await anonymousClient.request<any>(signUpWithEmailPasswordMutation, {
				input: {
					authentication: {
						emailPassword: { email, password },
					},
				},
			})

			expect(spyOnSignUp).toHaveBeenCalledTimes(1)

			const users = await wabe.controllers.database.getObjects({
				className: 'User',
				where: {
					authentication: {
						emailPassword: {
							email: { equalTo: email },
						},
					},
				},
				select: { authentication: true },
				first: 1,
				context: contextWithRoot({ wabe, isRoot: true }),
			})

			const storedPassword = users[0]?.authentication?.emailPassword?.password
			expect(storedPassword).toEqual(expect.any(String))
			expect(await verifyArgon2(password, storedPassword!)).toBe(true)
		} finally {
			spyOnSignUp.mockRestore()
		}
	})

	it('should still call onSignUp once when creating a User directly', async () => {
		const spyOnSignUp = spyOn(EmailPassword.prototype, 'onSignUp')
		const email = 'signup-hook@test.fr'

		try {
			await wabe.controllers.database.createObject({
				className: 'User',
				context: contextWithRoot({ wabe, isRoot: true }),
				data: {
					authentication: {
						emailPassword: {
							email,
							password: 'password',
						},
					},
				},
				select: { id: true },
			})

			expect(spyOnSignUp).toHaveBeenCalledTimes(1)
		} finally {
			spyOnSignUp.mockRestore()
		}
	})
})
