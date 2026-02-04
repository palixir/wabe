import { beforeAll, afterAll, describe, expect, it, beforeEach } from 'bun:test'
import { type DevWabeTypes, getAnonymousClient } from '../../utils/helper'
import type { Wabe } from '../../server'
import { gql } from 'graphql-request'
import { setupTests, closeTests } from '../../utils/testHelper'

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

		const res = await anonymousClient.request<any>(
			gql`
				mutation signUpWith($input: SignUpWithInput!) {
					signUpWith(input: $input) {
						id
						accessToken
						refreshToken
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

		expect(res.signUpWith.id).toEqual(expect.any(String))
		expect(res.signUpWith.accessToken).toEqual(expect.any(String))
		expect(res.signUpWith.refreshToken).toEqual(expect.any(String))
	})
})
