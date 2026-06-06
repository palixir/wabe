import { afterAll, beforeAll, describe, expect, it, spyOn } from 'bun:test'
import { gql } from 'graphql-request'
import { EmailDevAdapter } from '../email/DevAdapter'
import type { Wabe } from '../server'
import { getAnonymousClient, type DevWabeTypes } from '../utils/helper'
import { closeTests, setupTests } from '../utils/testHelper'

const extractOtpFromEmail = (html: string) => {
	const match = html.match(/class="otp-code">(\d{6})</)
	return match?.[1]
}

const getLastSentOtp = (spySend: { mock: { calls: Array<Array<unknown>> } }) => {
	const html = (spySend.mock.calls.at(-1)?.[0] as { html?: string } | undefined)?.html as string
	return extractOtpFromEmail(html)
}

const rootContext = (wabe: Wabe<DevWabeTypes>) => ({ isRoot: true, wabe }) as any

describe('Magic link authentication integration', () => {
	let wabe: Wabe<DevWabeTypes>
	const spySend = spyOn(EmailDevAdapter.prototype, 'send')

	beforeAll(async () => {
		const setup = await setupTests()
		wabe = setup.wabe
	})

	afterAll(async () => {
		await closeTests(wabe)
	})

	const signInMagicLink = (client: ReturnType<typeof getAnonymousClient>, email: string) =>
		client.request<any>(
			gql`
				mutation signInWith($input: SignInWithInput!) {
					signInWith(input: $input) {
						challengeToken
						accessToken
						user {
							email
						}
					}
				}
			`,
			{
				input: {
					authentication: {
						magicLink: { email },
					},
				},
			},
		)

	const signUpMagicLink = (client: ReturnType<typeof getAnonymousClient>, email: string) =>
		client.request<any>(
			gql`
				mutation signUpWith($input: SignUpWithInput!) {
					signUpWith(input: $input) {
						id
						challengeToken
						accessToken
					}
				}
			`,
			{
				input: {
					authentication: {
						magicLink: { email },
					},
				},
			},
		)

	const verifyMagicLink = (
		client: ReturnType<typeof getAnonymousClient>,
		email: string,
		challengeToken: string,
		otp: string,
	) =>
		client.request<any>(
			gql`
				mutation verifyChallenge($input: VerifyChallengeInput!) {
					verifyChallenge(input: $input) {
						accessToken
					}
				}
			`,
			{
				input: {
					challengeToken,
					secondFA: {
						magicLinkChallenge: { email, otp },
					},
				},
			},
		)

	const withSecurityConfig = async <T>(
		patch: {
			magicLinkMaxAttempts?: number
			magicLinkOtpTtlMs?: number
			disableSignUp?: boolean
		},
		run: () => Promise<T>,
	) => {
		const auth = wabe.config.authentication
		if (!auth) throw new Error('Authentication config not found')

		auth.security ??= {}
		const security = auth.security
		const previous = {
			magicLinkMaxAttempts: security.magicLinkMaxAttempts,
			magicLinkOtpTtlMs: security.magicLinkOtpTtlMs,
			disableSignUp: auth.disableSignUp,
		}

		if (patch.magicLinkMaxAttempts !== undefined) {
			security.magicLinkMaxAttempts = patch.magicLinkMaxAttempts
		}
		if (patch.magicLinkOtpTtlMs !== undefined) {
			security.magicLinkOtpTtlMs = patch.magicLinkOtpTtlMs
		}
		if (patch.disableSignUp !== undefined) {
			auth.disableSignUp = patch.disableSignUp
		}

		try {
			return await run()
		} finally {
			security.magicLinkMaxAttempts = previous.magicLinkMaxAttempts
			security.magicLinkOtpTtlMs = previous.magicLinkOtpTtlMs
			auth.disableSignUp = previous.disableSignUp
		}
	}

	it('should sign up, verify OTP and create user only after verification', async () => {
		const client = getAnonymousClient(wabe.config.port)
		const email = 'magic-signup@test.fr'

		spySend.mockClear()

		const usersBefore = await wabe.controllers.database.count({
			className: 'User',
			where: { email: { equalTo: email } },
			context: rootContext(wabe),
		})
		expect(usersBefore).toBe(0)

		const signUp = await signUpMagicLink(client, email)
		expect(signUp.signUpWith.challengeToken).toEqual(expect.any(String))
		expect(signUp.signUpWith.accessToken).toBeNull()
		expect(signUp.signUpWith.id).toBeNull()
		expect(spySend).toHaveBeenCalledTimes(1)

		const usersAfterSignUp = await wabe.controllers.database.count({
			className: 'User',
			where: { email: { equalTo: email } },
			context: rootContext(wabe),
		})
		expect(usersAfterSignUp).toBe(0)

		const resolvedOtp = getLastSentOtp(spySend)

		expect(resolvedOtp).toMatch(/^\d{6}$/)

		const verify = await verifyMagicLink(
			client,
			email,
			signUp.signUpWith.challengeToken,
			resolvedOtp!,
		)
		expect(verify.verifyChallenge.accessToken).toEqual(expect.any(String))

		const usersAfterVerify = await wabe.controllers.database.count({
			className: 'User',
			where: { email: { equalTo: email } },
			context: rootContext(wabe),
		})
		expect(usersAfterVerify).toBe(1)
	})

	it('should sign in existing user with magic link', async () => {
		const client = getAnonymousClient(wabe.config.port)
		const email = 'magic-signin@test.fr'

		spySend.mockClear()

		const firstSignUp = await signUpMagicLink(client, email)
		const firstOtp = getLastSentOtp(spySend)!
		await verifyMagicLink(client, email, firstSignUp.signUpWith.challengeToken, firstOtp)

		spySend.mockClear()

		const signIn = await signInMagicLink(client, email)
		expect(signIn.signInWith.challengeToken).toEqual(expect.any(String))
		expect(signIn.signInWith.accessToken).toBeNull()
		expect(signIn.signInWith.user).toBeNull()
		expect(spySend).toHaveBeenCalledTimes(1)

		const otp = getLastSentOtp(spySend)!

		const verify = await verifyMagicLink(client, email, signIn.signInWith.challengeToken, otp)
		expect(verify.verifyChallenge.accessToken).toEqual(expect.any(String))
	})

	it('should sign in unknown email without revealing account existence', async () => {
		const client = getAnonymousClient(wabe.config.port)
		const email = 'magic-new-signin@test.fr'

		spySend.mockClear()

		const signIn = await signInMagicLink(client, email)
		expect(signIn.signInWith.challengeToken).toEqual(expect.any(String))
		expect(signIn.signInWith.accessToken).toBeNull()
		expect(signIn.signInWith.user).toBeNull()
		expect(spySend).not.toHaveBeenCalled()

		await expect(
			verifyMagicLink(client, email, signIn.signInWith.challengeToken, '123456'),
		).rejects.toThrow('Invalid challenge')

		const count = await wabe.controllers.database.count({
			className: 'User',
			where: { email: { equalTo: email } },
			context: rootContext(wabe),
		})
		expect(count).toBe(0)
	})

	it('should reject signUp when email already exists', async () => {
		const client = getAnonymousClient(wabe.config.port)
		const email = 'magic-duplicate@test.fr'

		const signUp = await signUpMagicLink(client, email)
		const otp = getLastSentOtp(spySend)!
		await verifyMagicLink(client, email, signUp.signUpWith.challengeToken, otp)

		expect(signUpMagicLink(client, email)).rejects.toThrow('Not authorized to create user')
	})

	it('should reject signUp verification when account already exists', async () => {
		const client = getAnonymousClient(wabe.config.port)
		const email = 'magic-signup-existing@test.fr'

		spySend.mockClear()

		const signUp = await signUpMagicLink(client, email)
		const otp = getLastSentOtp(spySend)!

		await wabe.controllers.database.createObject({
			className: 'User',
			data: {
				email,
				authentication: {
					magicLink: { email },
				},
			},
			context: rootContext(wabe),
			select: { id: true },
		})

		await expect(
			verifyMagicLink(client, email, signUp.signUpWith.challengeToken, otp!),
		).rejects.toThrow('Invalid challenge')
	})

	it('should reject replay of challenge token', async () => {
		const client = getAnonymousClient(wabe.config.port)
		const email = 'magic-replay@test.fr'

		const signUp = await signUpMagicLink(client, email)
		const otp = getLastSentOtp(spySend)!

		await verifyMagicLink(client, email, signUp.signUpWith.challengeToken, otp)

		expect(verifyMagicLink(client, email, signUp.signUpWith.challengeToken, otp)).rejects.toThrow(
			'Invalid challenge',
		)
	})

	it('should invalidate the previous OTP after a resend', async () => {
		const client = getAnonymousClient(wabe.config.port)
		const email = 'magic-resend@test.fr'

		spySend.mockClear()

		const first = await signUpMagicLink(client, email)
		const firstOtp = getLastSentOtp(spySend)!
		const second = await signUpMagicLink(client, email)
		const secondOtp = getLastSentOtp(spySend)!

		expect(first.signUpWith.challengeToken).not.toBe(second.signUpWith.challengeToken)
		expect(
			verifyMagicLink(client, email, first.signUpWith.challengeToken, firstOtp),
		).rejects.toThrow('Invalid challenge')

		const verify = await verifyMagicLink(client, email, second.signUpWith.challengeToken, secondOtp)
		expect(verify.verifyChallenge.accessToken).toEqual(expect.any(String))
	})

	it('should reject invalid OTP', async () => {
		const client = getAnonymousClient(wabe.config.port)
		const email = 'magic-invalid-otp@test.fr'

		const signUp = await signUpMagicLink(client, email)

		expect(
			verifyMagicLink(client, email, signUp.signUpWith.challengeToken, '111111'),
		).rejects.toThrow('Invalid challenge')
	})

	it('should verify after a wrong OTP then the correct OTP', async () => {
		const client = getAnonymousClient(wabe.config.port)
		const email = 'magic-retry-otp@test.fr'

		spySend.mockClear()

		const signUp = await signUpMagicLink(client, email)
		const otp = getLastSentOtp(spySend)!

		await expect(
			verifyMagicLink(client, email, signUp.signUpWith.challengeToken, '111111'),
		).rejects.toThrow('Invalid challenge')

		const verify = await verifyMagicLink(client, email, signUp.signUpWith.challengeToken, otp!)
		expect(verify.verifyChallenge.accessToken).toEqual(expect.any(String))
	})

	it('should invalidate challenge after max invalid OTP attempts', async () => {
		await withSecurityConfig({ magicLinkMaxAttempts: 2 }, async () => {
			const client = getAnonymousClient(wabe.config.port)
			const email = 'magic-max-attempts@test.fr'

			spySend.mockClear()

			const signUp = await signUpMagicLink(client, email)
			const otp = getLastSentOtp(spySend)!

			await expect(
				verifyMagicLink(client, email, signUp.signUpWith.challengeToken, '111111'),
			).rejects.toThrow('Invalid challenge')

			await expect(
				verifyMagicLink(client, email, signUp.signUpWith.challengeToken, '222222'),
			).rejects.toThrow('Invalid challenge')

			await expect(
				verifyMagicLink(client, email, signUp.signUpWith.challengeToken, otp!),
			).rejects.toThrow('Invalid challenge')
		})
	})

	it('should reject verification with wrong email for challenge token', async () => {
		const client = getAnonymousClient(wabe.config.port)
		const email = 'magic-wrong-email@test.fr'

		spySend.mockClear()

		const signUp = await signUpMagicLink(client, email)
		const otp = getLastSentOtp(spySend)!

		await expect(
			verifyMagicLink(client, 'other@example.com', signUp.signUpWith.challengeToken, otp!),
		).rejects.toThrow('Invalid challenge')
	})

	it('should reject expired OTP', async () => {
		await withSecurityConfig({ magicLinkOtpTtlMs: 1 }, async () => {
			const client = getAnonymousClient(wabe.config.port)
			const email = 'magic-expired@test.fr'

			spySend.mockClear()

			const signUp = await signUpMagicLink(client, email)
			const otp = getLastSentOtp(spySend)!

			await Bun.sleep(20)

			await expect(
				verifyMagicLink(client, email, signUp.signUpWith.challengeToken, otp!),
			).rejects.toThrow('Invalid challenge')
		})
	})

	it('should not create a new account from sign in when sign up is disabled', async () => {
		await withSecurityConfig({ disableSignUp: true }, async () => {
			const client = getAnonymousClient(wabe.config.port)
			const email = 'magic-disabled-signup@test.fr'

			spySend.mockClear()

			const signIn = await signInMagicLink(client, email)
			expect(spySend).not.toHaveBeenCalled()

			await expect(
				verifyMagicLink(client, email, signIn.signInWith.challengeToken, '123456'),
			).rejects.toThrow('Invalid challenge')

			const count = await wabe.controllers.database.count({
				className: 'User',
				where: { email: { equalTo: email } },
				context: rootContext(wabe),
			})
			expect(count).toBe(0)
		})
	})
})
