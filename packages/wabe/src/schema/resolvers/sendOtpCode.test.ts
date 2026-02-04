import { describe, afterAll, beforeAll, it, spyOn, expect, beforeEach } from 'bun:test'
import { gql, type GraphQLClient } from 'graphql-request'
import type { Wabe } from '../../server'
import { type DevWabeTypes, getGraphqlClient, getAnonymousClient } from '../../utils/helper'
import { setupTests, closeTests } from '../../utils/testHelper'
import { EmailDevAdapter } from '../../email/DevAdapter'

describe('sendOtpCodeResolver', () => {
	let wabe: Wabe<DevWabeTypes>
	let port: number
	let client: GraphQLClient

	const spySend = spyOn(EmailDevAdapter.prototype, 'send')

	beforeAll(async () => {
		const setup = await setupTests()
		wabe = setup.wabe
		port = setup.port
		client = getGraphqlClient(port)
	})

	afterAll(async () => {
		await closeTests(wabe)
	})

	beforeEach(() => {
		spySend.mockClear()
	})

	it('should use the provided email template if provided', async () => {
		const previous = wabe.config.email
		// @ts-expect-error
		wabe.config.email = {
			...wabe.config.email,
			htmlTemplates: {
				sendOTPCode: {
					fn: () => 'toto',
					subject: 'Confirmation code',
				},
			},
		}

		await client.request<any>(graphql.createUser, {
			input: {
				fields: {
					authentication: {
						emailPassword: {
							email: 'tata@toto.fr',
							password: 'totototo',
						},
					},
				},
			},
		})

		await client.request<any>(graphql.sendOtpCode, {
			input: {
				email: 'tata@toto.fr',
			},
		})

		expect(spySend).toHaveBeenCalledTimes(1)
		expect(spySend).toHaveBeenCalledWith({
			from: 'main.email@wabe.com',
			to: ['tata@toto.fr'],
			subject: 'Confirmation code',
			html: 'toto',
		})

		wabe.config.email = previous
	})

	it("should send an OTP code to the user's email as anonymous client", async () => {
		const anonymousClient = getAnonymousClient(port)

		await anonymousClient.request<any>(graphql.createUserWithAnonymous, {
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

		await anonymousClient.request<any>(graphql.sendOtpCode, {
			input: {
				email: 'toto@toto.fr',
			},
		})

		expect(spySend).toHaveBeenCalledTimes(1)
		expect(spySend).toHaveBeenCalledWith({
			from: 'main.email@wabe.com',
			to: ['toto@toto.fr'],
			subject: 'Your OTP code',
			html: expect.any(String),
		})
	})

	it("should return true if the user doesn't exist (hide sensitive data)", async () => {
		const spySend = spyOn(EmailDevAdapter.prototype, 'send')

		const res = await client.request<any>(graphql.sendOtpCode, {
			input: {
				email: 'invalidUser@toto.fr',
			},
		})

		expect(res.sendOtpCode).toEqual(true)

		expect(spySend).toHaveBeenCalledTimes(0)
	})
})

const graphql = {
	createUser: gql`
		mutation createUser($input: CreateUserInput!) {
			createUser(input: $input) {
				user {
					id
				}
			}
		}
	`,
	createUserWithAnonymous: gql`
		mutation createUser($input: CreateUserInput!) {
			createUser(input: $input) {
				ok
			}
		}
	`,
	sendOtpCode: gql`
		mutation sendOtpCode($input: SendOtpCodeInput!) {
			sendOtpCode(input: $input)
		}
	`,
}
