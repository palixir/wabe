import crypto from 'node:crypto'
import { magicLinkTemplate } from '../../email/templates/magicLink'
import type { DevWabeTypes } from '../../utils/helper'
import { normalizeEmail } from '../../utils/email'
import { contextWithRoot } from '../../utils/export'
import type {
	AuthenticationEventsOptions,
	OnVerifyChallengeOptions,
	ProviderInterface,
	SecondaryProviderInterface,
} from '../interface'
import { MagicLinkIntent } from '../interface'
import {
	consumeMagicLinkChallenge,
	createMagicLinkChallenge,
	findMagicLinkUserByEmail,
	normalizeMagicLinkEmail,
} from '../magicLinkChallenge'
import { runDummyMagicLinkOtpWork } from '../magicLinkOtp'
import {
	clearRateLimit,
	isRateLimited,
	registerRateLimitAttempt,
	registerRateLimitFailure,
} from '../security'

type MagicLinkInput = {
	email: string
}

type MagicLinkChallengeInput = {
	email: string
	otp: string
}

const getMagicLinkRequestRateLimitKey = (email: string) => `magicLink:${email}`
const getMagicLinkVerifyRateLimitKey = (email: string, challengeToken: string) =>
	`magicLinkChallenge:${email}:${challengeToken}`
const getMagicLinkRequestMutexKey = (email: string, intent: MagicLinkIntent) =>
	`magic-link-request:${intent}:${email}`

const clearMagicLinkRateLimits = (
	context: AuthenticationEventsOptions<DevWabeTypes, MagicLinkInput>['context'],
	email: string,
	challengeToken?: string,
) => {
	clearRateLimit(context, 'signIn', getMagicLinkRequestRateLimitKey(email))
	clearRateLimit(context, 'signUp', getMagicLinkRequestRateLimitKey(email))
	clearRateLimit(context, 'sendOtpCode', getMagicLinkRequestRateLimitKey(email))
	if (challengeToken) {
		clearRateLimit(
			context,
			'verifyChallenge',
			getMagicLinkVerifyRateLimitKey(email, challengeToken),
		)
	}
}

const isMagicLinkAccountCreationAllowed = (
	context: AuthenticationEventsOptions<DevWabeTypes, MagicLinkInput>['context'],
) => !context.wabe.config.authentication?.disableSignUp

const sendMagicLinkOtpEmail = async (
	context: AuthenticationEventsOptions<DevWabeTypes, MagicLinkInput>['context'],
	email: string,
	otp: string,
) => {
	const emailController = context.wabe.controllers.email

	if (!emailController) throw new Error('Email controller not found')

	const mainEmail = context.wabe.config.email?.mainEmail

	if (!mainEmail) throw new Error('No main email found')

	const template = context.wabe.config.email?.htmlTemplates?.magicLink

	await emailController.send({
		from: mainEmail,
		to: [email],
		subject: template?.subject || 'Your sign-in code',
		html: template?.fn ? await template.fn({ otp }) : magicLinkTemplate(otp),
	})
}

export const requestMagicLinkOtp = async (
	context: AuthenticationEventsOptions<DevWabeTypes, MagicLinkInput>['context'],
	email: string,
	intent: MagicLinkIntent,
) => {
	const normalizedEmail = normalizeMagicLinkEmail(email)
	const rateLimitKey = getMagicLinkRequestRateLimitKey(normalizedEmail)
	const requestMutexKey = getMagicLinkRequestMutexKey(normalizedEmail, intent)
	const didAcquireLock = await context.wabe.controllers.mutex.lockMutex(requestMutexKey)

	if (!didAcquireLock) {
		if (intent === MagicLinkIntent.signIn) throw new Error('Invalid authentication credentials')
		throw new Error('Not authorized to create user')
	}

	try {
		if (isRateLimited(context, 'sendOtpCode', rateLimitKey)) {
			if (intent === MagicLinkIntent.signIn) throw new Error('Invalid authentication credentials')
			throw new Error('Not authorized to create user')
		}

		const { challengeToken, otp } = await createMagicLinkChallenge(context, {
			email: normalizedEmail,
			intent,
		})

		await sendMagicLinkOtpEmail(context, normalizedEmail, otp)
		registerRateLimitAttempt(context, 'sendOtpCode', rateLimitKey)

		return challengeToken
	} finally {
		await context.wabe.controllers.mutex.unlockMutex(requestMutexKey)
	}
}

export class MagicLink implements ProviderInterface<DevWabeTypes, MagicLinkInput> {
	async onSignIn({ input, context }: AuthenticationEventsOptions<DevWabeTypes, MagicLinkInput>) {
		const normalizedEmail = normalizeEmail(input.email)
		if (!normalizedEmail) throw new Error('Invalid authentication credentials')

		const existingUser = await findMagicLinkUserByEmail(context, normalizedEmail)

		if (!existingUser && !isMagicLinkAccountCreationAllowed(context)) {
			runDummyMagicLinkOtpWork(context.wabe.config.rootKey)
			return {
				user: { email: normalizedEmail },
				challengeToken: crypto.randomUUID(),
			}
		}

		const challengeToken = await requestMagicLinkOtp(
			context,
			normalizedEmail,
			MagicLinkIntent.signIn,
		)

		return {
			user: { email: normalizedEmail },
			challengeToken,
		}
	}

	async onSignUp({ input, context }: AuthenticationEventsOptions<DevWabeTypes, MagicLinkInput>) {
		const normalizedEmail = normalizeEmail(input.email)
		if (!normalizedEmail) throw new Error('Not authorized to create user')
		const rateLimitKey = getMagicLinkRequestRateLimitKey(normalizedEmail)

		if (isRateLimited(context, 'signUp', rateLimitKey))
			throw new Error('Not authorized to create user')

		const existingCount = await context.wabe.controllers.database.count({
			className: 'User',
			where: { email: { equalTo: normalizedEmail } },
			context: contextWithRoot(context),
		})

		if (existingCount > 0) {
			registerRateLimitFailure(context, 'signUp', rateLimitKey)
			throw new Error('Not authorized to create user')
		}

		const challengeToken = await requestMagicLinkOtp(
			context,
			normalizedEmail,
			MagicLinkIntent.signUp,
		)

		return {
			authenticationDataToSave: {
				email: normalizedEmail,
			},
			challengeToken,
		}
	}
}

export class MagicLinkChallenge implements SecondaryProviderInterface<
	DevWabeTypes,
	MagicLinkChallengeInput
> {
	async onVerifyChallenge({
		context,
		input,
		challengeToken,
	}: OnVerifyChallengeOptions<DevWabeTypes, MagicLinkChallengeInput>) {
		const normalizedEmail = normalizeMagicLinkEmail(input.email)
		const rateLimitKey = getMagicLinkVerifyRateLimitKey(normalizedEmail, challengeToken)
		const fail = () => {
			registerRateLimitFailure(context, 'verifyChallenge', rateLimitKey)
			return null
		}

		if (isRateLimited(context, 'verifyChallenge', rateLimitKey)) return fail()

		const consumed = await consumeMagicLinkChallenge(context, {
			challengeToken,
			email: normalizedEmail,
			otp: input.otp,
		})

		if (!consumed) return fail()

		if (consumed.intent === MagicLinkIntent.signUp && consumed.userId) return fail()

		if (consumed.userId) {
			clearMagicLinkRateLimits(context, normalizedEmail, challengeToken)
			return { userId: consumed.userId }
		}

		if (!isMagicLinkAccountCreationAllowed(context)) return fail()

		const created = await context.wabe.controllers.database.createObject({
			className: 'User',
			data: {
				authentication: {
					magicLink: {
						email: consumed.email,
					},
				},
			},
			context: contextWithRoot(context),
			select: { id: true },
		})

		const userId = created?.id

		if (!userId) return fail()

		clearMagicLinkRateLimits(context, normalizedEmail, challengeToken)

		return { userId }
	}
}
