import { describe, expect, it, beforeEach, mock } from 'bun:test'
import {
	isRateLimited,
	registerRateLimitFailure,
	clearRateLimit,
	createMfaChallenge,
	consumeMfaChallenge,
} from './security'
import type { WabeContext } from '../server/interface'

const makeContext = (overrides: Record<string, any> = {}): WabeContext<any> =>
	({
		wabe: {
			controllers: {
				database: {
					getObject: overrides.getObject ?? mock(() => Promise.resolve({})),
					updateObject: overrides.updateObject ?? mock(() => Promise.resolve({})),
				},
			},
			config: {
				authentication: {
					security: overrides.security ?? {},
				},
			},
		},
	}) as any

describe('Rate limiting', () => {
	const key = 'user@example.com'

	it('should be enabled by default (even without isProduction)', () => {
		const context = makeContext()
		expect(isRateLimited(context, 'signIn', key)).toBe(false)

		for (let i = 0; i < 10; i++) registerRateLimitFailure(context, 'signIn', key)

		expect(isRateLimited(context, 'signIn', key)).toBe(true)
	})

	it('should be disabled when explicitly set to false', () => {
		const context = makeContext({
			security: { signInRateLimit: { enabled: false } },
		})

		for (let i = 0; i < 20; i++) registerRateLimitFailure(context, 'signIn', key)

		expect(isRateLimited(context, 'signIn', key)).toBe(false)
	})

	it('should block after maxAttempts and unblock after clearRateLimit', () => {
		const uniqueKey = `rate-clear-${Date.now()}`
		const context = makeContext({
			security: {
				signInRateLimit: {
					enabled: true,
					maxAttempts: 3,
					windowMs: 60_000,
					blockDurationMs: 60_000,
				},
			},
		})

		for (let i = 0; i < 3; i++) registerRateLimitFailure(context, 'signIn', uniqueKey)
		expect(isRateLimited(context, 'signIn', uniqueKey)).toBe(true)

		clearRateLimit(context, 'signIn', uniqueKey)
		expect(isRateLimited(context, 'signIn', uniqueKey)).toBe(false)
	})

	it('should apply default enabled for all scopes', () => {
		const scopes = ['signIn', 'signUp', 'verifyChallenge', 'sendOtpCode', 'resetPassword'] as const
		const context = makeContext()

		for (const scope of scopes) {
			const scopeKey = `scope-default-${scope}-${Date.now()}`
			for (let i = 0; i < 10; i++) registerRateLimitFailure(context, scope, scopeKey)
			expect(isRateLimited(context, scope, scopeKey)).toBe(true)
		}
	})
})

describe('MFA challenge', () => {
	let pendingChallenges: Array<{ token: string; provider: string; expiresAt: Date }> = []

	const mockGetObject = mock(() => Promise.resolve({ pendingChallenges }))
	const mockUpdateObject = mock((options: any) => {
		pendingChallenges = options?.data?.pendingChallenges || []
		return Promise.resolve({})
	})

	const context = makeContext({
		getObject: mockGetObject,
		updateObject: mockUpdateObject,
	})

	beforeEach(() => {
		pendingChallenges = []
		mockGetObject.mockClear()
		mockUpdateObject.mockClear()
	})

	it('should create and consume a challenge successfully', async () => {
		const token = await createMfaChallenge(context, {
			userId: 'user1',
			provider: 'emailOTP',
		})

		expect(typeof token).toBe('string')
		expect(token.length).toBeGreaterThan(0)

		const consumed = await consumeMfaChallenge(context, {
			challengeToken: token,
			userId: 'user1',
			provider: 'emailOTP',
		})

		expect(consumed).toBe(true)
	})

	it('should prevent double-consumption of the same challenge', async () => {
		const token = await createMfaChallenge(context, {
			userId: 'user1',
			provider: 'emailOTP',
		})

		const first = await consumeMfaChallenge(context, {
			challengeToken: token,
			userId: 'user1',
			provider: 'emailOTP',
		})
		expect(first).toBe(true)

		const second = await consumeMfaChallenge(context, {
			challengeToken: token,
			userId: 'user1',
			provider: 'emailOTP',
		})
		expect(second).toBe(false)
	})

	it('should reject an invalid challenge token', async () => {
		await createMfaChallenge(context, {
			userId: 'user1',
			provider: 'emailOTP',
		})

		const consumed = await consumeMfaChallenge(context, {
			challengeToken: 'invalid-token',
			userId: 'user1',
			provider: 'emailOTP',
		})

		expect(consumed).toBe(false)
	})

	it('should reject challenge with wrong provider', async () => {
		const token = await createMfaChallenge(context, {
			userId: 'user1',
			provider: 'emailOTP',
		})

		const consumed = await consumeMfaChallenge(context, {
			challengeToken: token,
			userId: 'user1',
			provider: 'smsOTP',
		})

		expect(consumed).toBe(false)
	})

	it('should serialize concurrent consumption attempts (race condition)', async () => {
		const token = await createMfaChallenge(context, {
			userId: 'raceUser',
			provider: 'emailOTP',
		})

		const results = await Promise.all([
			consumeMfaChallenge(context, {
				challengeToken: token,
				userId: 'raceUser',
				provider: 'emailOTP',
			}),
			consumeMfaChallenge(context, {
				challengeToken: token,
				userId: 'raceUser',
				provider: 'emailOTP',
			}),
			consumeMfaChallenge(context, {
				challengeToken: token,
				userId: 'raceUser',
				provider: 'emailOTP',
			}),
		])

		const successCount = results.filter(Boolean).length
		expect(successCount).toBe(1)
	})
})
