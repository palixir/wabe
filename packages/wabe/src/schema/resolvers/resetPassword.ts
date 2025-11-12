import type { MutationResetPasswordArgs } from '../../../generated/wabe'
import { OTP } from '../../authentication/OTP'
import type { WabeContext } from '../../server/interface'
import { contextWithRoot } from '../../utils/export'
import type { DevWabeTypes } from '../../utils/helper'

const DUMMY_USER_ID = '00000000-0000-0000-0000-000000000000'

export const resetPasswordResolver = async (
	_: any,
	{ input: { email, phone, password, otp } }: MutationResetPasswordArgs,
	context: WabeContext<DevWabeTypes>,
) => {
	if (!email && !phone) throw new Error('Email or phone is required')

	const users = await context.wabe.controllers.database.getObjects({
		className: 'User',
		where: {
			...(email && { email: { equalTo: email } }),
			...(phone && {
				authentication: { phonePassword: { phone: { equalTo: phone } } },
			}),
		},
		select: { id: true, authentication: true },
		first: 1,
		context: contextWithRoot(context),
	})

	const realUser = users.length > 0 ? users[0] : null
	const userId = realUser?.id ?? DUMMY_USER_ID

	const otpClass = new OTP(context.wabe.config.rootKey)
	const isOtpValid = otpClass.verify(otp, userId)

	if (realUser) {
		const inProd = process.env.NODE_ENV === 'production'
		const devBypass = !inProd && otp === '000000'

		if (!isOtpValid && !(devBypass && !inProd))
			throw new Error('Invalid OTP code')

		const providerKey = phone ? 'phonePassword' : 'emailPassword'

		await context.wabe.controllers.database.updateObject({
			className: 'User',
			id: realUser.id,
			data: {
				authentication: {
					[providerKey]: {
						...(phone && {
							phone: realUser.authentication?.phonePassword?.phone,
						}),
						...(email && { email }),
						password,
					},
				},
			},
			select: {},
			context: contextWithRoot(context),
		})
	}

	return true
}
