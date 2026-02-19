import crypto from 'node:crypto'
import type { WabeContext } from '../server/interface'
import type { WabeTypes } from '../server'
import { contextWithRoot, getDatabaseController } from '../utils/export'
import { DevWabeTypes } from 'src/utils/helper'

type RateLimitScope = 'signIn' | 'signUp' | 'verifyChallenge'

type RateLimitOptions = {
	enabled: boolean
	maxAttempts: number
	windowMs: number
	blockDurationMs: number
}

type RateLimitState = {
	attempts: number
	windowStartedAt: number
	blockedUntil: number
}

type PendingChallenge = {
	token: string
	provider: string
	expiresAt: number
}

const DEFAULT_SIGN_IN_RATE_LIMIT = {
	maxAttempts: 10,
	windowMs: 10 * 60 * 1000,
	blockDurationMs: 15 * 60 * 1000,
}

const DEFAULT_SIGN_UP_RATE_LIMIT = {
	maxAttempts: 10,
	windowMs: 10 * 60 * 1000,
	blockDurationMs: 15 * 60 * 1000,
}

const DEFAULT_VERIFY_CHALLENGE_RATE_LIMIT = {
	maxAttempts: 10,
	windowMs: 10 * 60 * 1000,
	blockDurationMs: 15 * 60 * 1000,
}

const DEFAULT_MFA_CHALLENGE_TTL_MS = 5 * 60 * 1000

const rateLimitStorage = new Map<string, RateLimitState>()

const getRateLimitOptions = <T extends WabeTypes>(
	context: WabeContext<T>,
	scope: RateLimitScope,
): RateLimitOptions => {
	const wabeConfig = context.wabe.config
	const securityConfig = wabeConfig?.authentication?.security
	const scopeConfigMap = {
		signIn: securityConfig?.signInRateLimit,
		signUp: securityConfig?.signUpRateLimit,
		verifyChallenge: securityConfig?.verifyChallengeRateLimit,
	}
	const defaultsMap = {
		signIn: DEFAULT_SIGN_IN_RATE_LIMIT,
		signUp: DEFAULT_SIGN_UP_RATE_LIMIT,
		verifyChallenge: DEFAULT_VERIFY_CHALLENGE_RATE_LIMIT,
	}
	const scopeConfig = scopeConfigMap[scope]
	const defaults = defaultsMap[scope]

	return {
		enabled: scopeConfig?.enabled ?? !!wabeConfig?.isProduction,
		maxAttempts: scopeConfig?.maxAttempts ?? defaults.maxAttempts,
		windowMs: scopeConfig?.windowMs ?? defaults.windowMs,
		blockDurationMs: scopeConfig?.blockDurationMs ?? defaults.blockDurationMs,
	}
}

const getRateLimitKey = (scope: RateLimitScope, key: string) =>
	`${scope}:${key.trim().toLowerCase()}`

export const isRateLimited = <T extends WabeTypes>(
	context: WabeContext<T>,
	scope: RateLimitScope,
	key: string,
): boolean => {
	const options = getRateLimitOptions(context, scope)

	if (!options.enabled) return false

	const now = Date.now()
	const storageKey = getRateLimitKey(scope, key)
	const state = rateLimitStorage.get(storageKey)

	if (!state) return false

	if (state.blockedUntil <= now) {
		if (state.windowStartedAt + options.windowMs <= now) {
			rateLimitStorage.delete(storageKey)
		}
		return false
	}

	return true
}

export const registerRateLimitFailure = <T extends WabeTypes>(
	context: WabeContext<T>,
	scope: RateLimitScope,
	key: string,
) => {
	const options = getRateLimitOptions(context, scope)

	if (!options.enabled) return

	const now = Date.now()
	const storageKey = getRateLimitKey(scope, key)
	const currentState = rateLimitStorage.get(storageKey)
	const hasExpiredBlock =
		!!currentState && currentState.blockedUntil > 0 && currentState.blockedUntil <= now
	const shouldResetWindow =
		!currentState || currentState.windowStartedAt + options.windowMs <= now || hasExpiredBlock

	const state: RateLimitState = shouldResetWindow
		? {
				attempts: 0,
				windowStartedAt: now,
				blockedUntil: 0,
			}
		: currentState

	state.attempts += 1

	if (state.attempts >= options.maxAttempts) {
		state.attempts = 0
		state.windowStartedAt = now
		state.blockedUntil = now + options.blockDurationMs
	}

	rateLimitStorage.set(storageKey, state)
}

export const clearRateLimit = <T extends WabeTypes>(
	context: WabeContext<T>,
	scope: RateLimitScope,
	key: string,
) => {
	const options = getRateLimitOptions(context, scope)

	if (!options.enabled) return

	rateLimitStorage.delete(getRateLimitKey(scope, key))
}

const getMfaChallengeTTL = <T extends WabeTypes>(context: WabeContext<T>) =>
	context.wabe.config?.authentication?.security?.mfaChallengeTtlMs || DEFAULT_MFA_CHALLENGE_TTL_MS

const parsePendingChallenges = (input: unknown): PendingChallenge[] => {
	if (!Array.isArray(input)) return []

	return input.reduce((acc, item) => {
		if (!item || typeof item !== 'object') return acc
		const challenge = item as Record<string, unknown>
		const token = typeof challenge.token === 'string' ? challenge.token : null
		const provider = typeof challenge.provider === 'string' ? challenge.provider : null
		const expiresAtRaw = challenge.expiresAt
		const expiresAt = new Date(expiresAtRaw as string | Date).getTime()

		if (!token || !provider || Number.isNaN(expiresAt)) return acc

		acc.push({
			token,
			provider: provider.toLowerCase(),
			expiresAt,
		})
		return acc
	}, [] as PendingChallenge[])
}

const pruneExpiredChallenges = (challenges: PendingChallenge[]) => {
	const now = Date.now()
	return challenges.filter((challenge) => challenge.expiresAt > now)
}

const getUserPendingChallenges = async (
	context: WabeContext<DevWabeTypes>,
	userId: string,
): Promise<PendingChallenge[] | null> => {
	try {
		const user = await getDatabaseController(context).getObject({
			className: 'User',
			id: userId,
			context: contextWithRoot(context),
			select: {
				pendingChallenges: true,
			},
		})

		return parsePendingChallenges(user?.pendingChallenges)
	} catch {
		return null
	}
}

const saveUserPendingChallenges = async (
	context: WabeContext<DevWabeTypes>,
	userId: string,
	challenges: PendingChallenge[],
) =>
	getDatabaseController(context).updateObject({
		className: 'User',
		id: userId,
		context: contextWithRoot(context),
		data: {
			pendingChallenges: challenges.map((challenge) => ({
				token: challenge.token,
				provider: challenge.provider,
				expiresAt: new Date(challenge.expiresAt),
			})),
		},
		select: {},
	})

export const createMfaChallenge = async (
	context: WabeContext<DevWabeTypes>,
	{ userId, provider }: { userId: string; provider: string },
): Promise<string> => {
	const token = crypto.randomUUID()
	const expiresAt = Date.now() + getMfaChallengeTTL(context)

	const currentChallenges = (await getUserPendingChallenges(context, userId)) || []
	const nextChallenges = [
		...pruneExpiredChallenges(currentChallenges),
		{
			token,
			provider: provider.toLowerCase(),
			expiresAt,
		},
	]

	await saveUserPendingChallenges(context, userId, nextChallenges)

	return token
}

export const consumeMfaChallenge = async (
	context: WabeContext<DevWabeTypes>,
	{
		challengeToken,
		userId,
		provider,
	}: {
		challengeToken: string
		userId: string
		provider: string
	},
): Promise<boolean> => {
	const currentChallenges = await getUserPendingChallenges(context, userId)
	if (!currentChallenges) return false

	const activeChallenges = pruneExpiredChallenges(currentChallenges)
	const normalizedProvider = provider.toLowerCase()
	const isValid = activeChallenges.some(
		(challenge) => challenge.token === challengeToken && challenge.provider === normalizedProvider,
	)
	const remainingChallenges = activeChallenges.filter(
		(challenge) =>
			!(challenge.token === challengeToken && challenge.provider === normalizedProvider),
	)

	if (remainingChallenges.length !== currentChallenges.length || isValid) {
		await saveUserPendingChallenges(context, userId, remainingChallenges)
	}

	return isValid
}

export const shouldRequireMfaChallenge = <T extends WabeTypes>(context: WabeContext<T>) =>
	context.wabe.config?.authentication?.security?.requireMfaChallengeInProduction ??
	!!context.wabe.config?.isProduction
