import type { MutationResetPasswordArgs } from '../../../generated/wabe'
import { OTP } from '../../authentication/OTP'
import type { WabeContext } from '../../server/interface'
import { contextWithRoot } from '../../utils/export'
import type { DevWabeTypes } from '../../utils/helper'

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

  // We return true if the user doesn't exist to avoid leaking that the user exists or not
  if (users.length === 0) return true

  const user = users[0]

  if (!user) return true

  const otpClass = new OTP(context.wabe.config.rootKey)

  const isOtpValid = otpClass.verify(otp, user.id)

  if (process.env.NODE_ENV === 'production' && !isOtpValid)
    throw new Error('Invalid OTP code')

  if (process.env.NODE_ENV !== 'production' && otp !== '000000' && !isOtpValid)
    throw new Error('Invalid OTP code')

  const nameOfProvider = phone ? 'phonePassword' : 'emailPassword'

  await context.wabe.controllers.database.updateObject({
    className: 'User',
    id: user.id,
    data: {
      authentication: {
        [nameOfProvider]: {
          ...(phone && { phone: user.authentication?.phonePassword?.phone }),
          ...(email && { email }),
          // The password is already hashed in the hook
          password,
        },
      },
    },
    select: {},
    context: contextWithRoot(context),
  })

  return true
}
