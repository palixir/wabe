import { afterAll, beforeAll, describe, it, expect } from 'bun:test'
import { createSRPClient } from 'js-srp6a'
import type { Wabe } from '../../server'
import { type DevWabeTypes, getAnonymousClient } from '../../utils/helper'
import { setupTests, closeTests } from '../../utils/testHelper'
import { gql } from 'graphql-request'

describe('EmailPasswordSRP', () => {
	let wabe: Wabe<DevWabeTypes>

	beforeAll(async () => {
		const setup = await setupTests()
		wabe = setup.wabe
	})

	afterAll(async () => {
		await closeTests(wabe)
	})

	it('should authenticate an user with SRP', async () => {
		const anonymousClient = getAnonymousClient(wabe.config.port)
		const email = 'test@gmail.com'
		const password = 'password'

		const client = createSRPClient('SHA-256', 3072)

		// Sign up
		const salt = client.generateSalt()
		const privateKey = await client.deriveSafePrivateKey(salt, password)
		const verifier = client.deriveVerifier(privateKey)

		await anonymousClient.request<any>(
			gql`
				mutation signUpWith($input: SignUpWithInput!) {
					signUpWith(input: $input) {
						accessToken
					}
				}
			`,
			{
				input: {
					authentication: {
						emailPasswordSRP: {
							email,
							salt,
							verifier,
						},
					},
				},
			},
		)

		// Sign in
		const clientEphemeral = client.generateEphemeral()

		const { signInWith } = await anonymousClient.request<any>(
			gql`
				mutation signInWith($input: SignInWithInput!) {
					signInWith(input: $input) {
						srp {
							salt
							serverPublic
						}
					}
				}
			`,
			{
				input: {
					authentication: {
						emailPasswordSRP: {
							email,
							clientPublic: clientEphemeral.public,
						},
					},
				},
			},
		)

		const clientSession = await client.deriveSession(
			clientEphemeral.secret,
			signInWith.srp.serverPublic,
			salt,
			'', // Because we don't hash the username
			privateKey,
		)

		const { verifyChallenge } = await anonymousClient.request<any>(
			gql`
				mutation verifyChallenge($input: VerifyChallengeInput!) {
					verifyChallenge(input: $input) {
						srp {
							serverSessionProof
						}
					}
				}
			`,
			{
				input: {
					secondFA: {
						emailPasswordSRPChallenge: {
							email,
							clientPublic: clientEphemeral.public,
							clientSessionProof: clientSession.proof,
						},
					},
				},
			},
		)

		expect(
			client.verifySession(
				clientEphemeral.public,
				clientSession,
				verifyChallenge.srp.serverSessionProof,
			),
		).resolves.toBeUndefined()
	})

	it('should not authenticate with invalid password', async () => {
		const anonymousClient = getAnonymousClient(wabe.config.port)
		const email = 'invalid@test.com'
		const correctPassword = 'correct_password'
		const wrongPassword = 'wrong_password'

		const client = createSRPClient('SHA-256', 3072)

		const salt = client.generateSalt()
		const privateKey = await client.deriveSafePrivateKey(salt, correctPassword)
		const verifier = client.deriveVerifier(privateKey)

		await anonymousClient.request<any>(
			gql`
				mutation signUpWith($input: SignUpWithInput!) {
					signUpWith(input: $input) {
						accessToken
					}
				}
			`,
			{
				input: {
					authentication: {
						emailPasswordSRP: { email, salt, verifier },
					},
				},
			},
		)

		const clientEphemeral = client.generateEphemeral()

		const { signInWith } = await anonymousClient.request<any>(
			gql`
				mutation signInWith($input: SignInWithInput!) {
					signInWith(input: $input) {
						srp {
							salt
							serverPublic
						}
					}
				}
			`,
			{
				input: {
					authentication: {
						emailPasswordSRP: {
							email,
							clientPublic: clientEphemeral.public,
						},
					},
				},
			},
		)

		// Derive with wrong password
		const wrongPrivateKey = await client.deriveSafePrivateKey(salt, wrongPassword)
		const wrongClientSession = await client.deriveSession(
			clientEphemeral.secret,
			signInWith.srp.serverPublic,
			salt,
			'',
			wrongPrivateKey,
		)

		expect(
			anonymousClient.request<any>(
				gql`
					mutation verifyChallenge($input: VerifyChallengeInput!) {
						verifyChallenge(input: $input) {
							srp {
								serverSessionProof
							}
						}
					}
				`,
				{
					input: {
						secondFA: {
							emailPasswordSRPChallenge: {
								email,
								clientPublic: clientEphemeral.public,
								clientSessionProof: wrongClientSession.proof,
							},
						},
					},
				},
			),
		).rejects.toThrow('Invalid authentication credentials')
	})
})
