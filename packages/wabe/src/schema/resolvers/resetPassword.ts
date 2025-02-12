import type { MutationResetPasswordArgs } from '../../../generated/wabe'
import { OTP } from '../../authentication/OTP'
import type { WabeContext } from '../../server/interface'
import { contextWithRoot } from '../../utils/export'
import type { DevWabeTypes } from '../../utils/helper'

export const resetPasswordResolver = async (
  _: any,
  { input: { email, password, otp, provider } }: MutationResetPasswordArgs,
  context: WabeContext<DevWabeTypes>,
) => {
  const user = await context.wabe.controllers.database.getObjects({
    className: 'User',
    where: {
      email: {
        equalTo: email,
      },
    },
    select: { id: true },
    first: 1,
    context: contextWithRoot(context),
  })

  // We return true if the user doesn't exist to avoid leaking that the user exists or not
  if (user.length === 0) return true

  const userId = user[0]?.id

  if (!userId) return false

  const otpClass = new OTP(context.wabe.config.rootKey)

  const isOtpValid = otpClass.verify(otp, userId)

  if (process.env.NODE_ENV === 'production' && !isOtpValid)
    throw new Error('Invalid OTP code')

  if (process.env.NODE_ENV !== 'production' && otp !== '000000' && !isOtpValid)
    throw new Error('Invalid OTP code')

  await context.wabe.controllers.database.updateObject({
    className: 'User',
    id: userId,
    data: {
      authentication: {
        [provider]: {
          email,
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
