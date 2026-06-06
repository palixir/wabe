import crypto from 'node:crypto'
import type { WabeContext } from '../server/interface'
import type { DevWabeTypes } from '../utils/helper'
import { normalizeEmail } from '../utils/email'
import { contextWithRoot, getDatabaseController } from '../utils/export'
import { MagicLinkIntent } from './interface'
import {
	generateMagicLinkOtp,
	hashMagicLinkOtp,
	runDummyMagicLinkOtpWork,
	verifyMagicLinkOtp,
} from './magicLinkOtp'

const DEFAULT_MAGIC_LINK_OTP_TTL_MS = 15 * 60 * 1000
const DEFAULT_MAGIC_LINK_MAX_ATTEMPTS = 5

const getMagicLinkOtpTtlMs = (context: WabeContext<DevWabeTypes>) =>
	context.wabe.config?.authentication?.security?.magicLinkOtpTtlMs ?? DEFAULT_MAGIC_LINK_OTP_TTL_MS

const getMagicLinkMaxAttempts = (context: WabeContext<DevWabeTypes>) =>
	context.wabe.config?.authentication?.security?.magicLinkMaxAttempts ??
	DEFAULT_MAGIC_LINK_MAX_ATTEMPTS

export const normalizeMagicLinkEmail = (email: string): string => {
	const normalized = normalizeEmail(email)
	if (!normalized) throw new Error('Invalid email')
	return normalized
}

export const findMagicLinkUserByEmail = async (
	context: WabeContext<DevWabeTypes>,
	email: string,
) => {
	const users = await getDatabaseController(context).getObjects({
		className: 'User',
		where: { email: { equalTo: email } },
		select: { id: true },
		first: 1,
		context: contextWithRoot(context),
	})

	return users[0] ?? null
}

const deleteChallengesForEmailAndIntent = async (
	context: WabeContext<DevWabeTypes>,
	email: string,
	intent: MagicLinkIntent,
) => {
	await getDatabaseController(context).deleteObjects({
		className: '_MagicLinkChallenge',
		where: {
			email: { equalTo: email },
			intent: { equalTo: intent },
		},
		select: {},
		context: contextWithRoot(context),
	})
}

const getMagicLinkMutexKey = (challengeToken: string) => `magic-link:${challengeToken}`

export const createMagicLinkChallenge = async (
	context: WabeContext<DevWabeTypes>,
	{ email, intent }: { email: string; intent: MagicLinkIntent },
) => {
	const normalizedEmail = normalizeMagicLinkEmail(email)
	const challengeToken = crypto.randomUUID()
	const otp = generateMagicLinkOtp()
	const otpHash = hashMagicLinkOtp(
		context.wabe.config.rootKey,
		normalizedEmail,
		challengeToken,
		otp,
	)
	const expiresAt = new Date(Date.now() + getMagicLinkOtpTtlMs(context))

	await deleteChallengesForEmailAndIntent(context, normalizedEmail, intent)

	await getDatabaseController(context).createObject({
		className: '_MagicLinkChallenge',
		data: {
			email: normalizedEmail,
			token: challengeToken,
			otpHash,
			expiresAt,
			intent,
			attempts: 0,
		},
		context: contextWithRoot(context),
		select: {},
	})

	return { challengeToken, otp }
}

export const consumeMagicLinkChallenge = async (
	context: WabeContext<DevWabeTypes>,
	{
		challengeToken,
		email,
		otp,
	}: {
		challengeToken: string
		email: string
		otp: string
	},
) => {
	const normalizedEmail = normalizeMagicLinkEmail(email)
	const rootKey = context.wabe.config.rootKey
	const rootContext = contextWithRoot(context)
	const mutexKey = getMagicLinkMutexKey(challengeToken)
	const didAcquireLock = await context.wabe.controllers.mutex.lockMutex(mutexKey)

	if (!didAcquireLock) {
		runDummyMagicLinkOtpWork(rootKey)
		return null
	}

	try {
		const challenges = await getDatabaseController(context).getObjects({
			className: '_MagicLinkChallenge',
			where: {
				token: { equalTo: challengeToken },
				email: { equalTo: normalizedEmail },
			},
			select: {
				id: true,
				otpHash: true,
				expiresAt: true,
				intent: true,
				email: true,
				attempts: true,
			},
			first: 1,
			context: rootContext,
		})

		const challenge = challenges[0]

		if (!challenge?.id || !challenge.otpHash || !challenge.expiresAt || !challenge.intent) {
			runDummyMagicLinkOtpWork(rootKey)
			return null
		}

		const expiresAtMs = new Date(challenge.expiresAt as string | Date).getTime()

		if (Number.isNaN(expiresAtMs) || expiresAtMs <= Date.now()) {
			runDummyMagicLinkOtpWork(rootKey)
			await getDatabaseController(context).deleteObject({
				className: '_MagicLinkChallenge',
				id: challenge.id,
				context: rootContext,
				select: {},
			})
			return null
		}

		const isValid = verifyMagicLinkOtp(
			rootKey,
			normalizedEmail,
			challengeToken,
			otp,
			String(challenge.otpHash),
		)

		if (!isValid) {
			runDummyMagicLinkOtpWork(rootKey)

			const nextAttempts = Number(challenge.attempts ?? 0) + 1

			if (nextAttempts >= getMagicLinkMaxAttempts(context)) {
				await getDatabaseController(context).deleteObject({
					className: '_MagicLinkChallenge',
					id: challenge.id,
					context: rootContext,
					select: {},
				})
			} else {
				await getDatabaseController(context).updateObject({
					className: '_MagicLinkChallenge',
					id: challenge.id,
					data: {
						attempts: nextAttempts,
					},
					context: rootContext,
					select: {},
				})
			}
			return null
		}

		await getDatabaseController(context).deleteObject({
			className: '_MagicLinkChallenge',
			id: challenge.id,
			context: rootContext,
			select: {},
		})

		const existingUser = await findMagicLinkUserByEmail(context, normalizedEmail)

		return {
			intent: challenge.intent as MagicLinkIntent,
			email: String(challenge.email),
			userId: existingUser?.id,
		}
	} finally {
		await context.wabe.controllers.mutex.unlockMutex(mutexKey)
	}
}
