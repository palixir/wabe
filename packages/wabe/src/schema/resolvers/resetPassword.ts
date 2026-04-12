import type { MutationResetPasswordArgs } from '../../../generated/wabe'
import { OTP, getOrCreateOtpSalt } from '../../authentication/OTP'
import {
	clearRateLimit,
	isRateLimited,
	registerRateLimitFailure,
} from '../../authentication/security'
import type { WabeContext } from '../../server/interface'
import { contextWithRoot } from '../../utils/export'
import type { DevWabeTypes } from '../../utils/helper'

const DUMMY_USER_ID = '00000000-0000-0000-0000-000000000000'

export const resetPasswordResolver = async (
	_: any,
	{ input: { email, phone, password, otp } }: MutationResetPasswordArgs,
	context: WabeContext<DevWabeTypes>,
) => {
	const normalizedEmail = email?.trim().toLowerCase()
	const normalizedPhone = phone?.trim()
	if (!normalizedEmail && !normalizedPhone) throw new Error('Email or phone is required')
	if (normalizedEmail && normalizedPhone) throw new Error('Email or phone is required')

	const identifier = normalizedEmail || normalizedPhone
	if (!identifier) throw new Error('Email or phone is required')

	const rateLimitKey = `resetPassword:${identifier}`
	if (isRateLimited(context, 'resetPassword', rateLimitKey))
		throw new Error('Too many attempts. Please try again later.')

	const users = await context.wabe.controllers.database.getObjects({
		className: 'User',
		where: {
			...(normalizedEmail && { email: { equalTo: normalizedEmail } }),
			...(normalizedPhone && {
				authentication: {
					phonePassword: { phone: { equalTo: normalizedPhone } },
				},
			}),
		},
		select: { id: true, authentication: true },
		first: 1,
		context: contextWithRoot(context),
	})

	const realUser = users.length > 0 ? users[0] : null
	const userId = realUser?.id ?? DUMMY_USER_ID

	const otpClass = new OTP(context.wabe.config.rootKey)
	const salt = realUser ? await getOrCreateOtpSalt(context, userId) : undefined
	const isOtpValid = otpClass.verify(otp, userId, salt)

	if (realUser) {
		if (!isOtpValid) {
			registerRateLimitFailure(context, 'resetPassword', rateLimitKey)
			throw new Error('Invalid OTP code')
		}

		const providerKey = normalizedPhone ? 'phonePassword' : 'emailPassword'

		await context.wabe.controllers.database.updateObject({
			className: 'User',
			id: realUser.id,
			data: {
				authentication: {
					[providerKey]: {
						...(normalizedPhone && {
							phone: realUser.authentication?.phonePassword?.phone,
						}),
						...(normalizedEmail && { email: normalizedEmail }),
						password,
					},
				},
			},
			select: {},
			context: contextWithRoot(context),
		})

		await context.wabe.controllers.database.deleteObjects({
			className: '_Session',
			where: {
				user: { id: { equalTo: realUser.id } },
			},
			select: {},
			context: contextWithRoot(context),
		})

		clearRateLimit(context, 'resetPassword', rateLimitKey)
	} else {
		registerRateLimitFailure(context, 'resetPassword', rateLimitKey)
	}

	return true
}
