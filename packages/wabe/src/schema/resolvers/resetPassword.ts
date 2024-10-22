import type { MutationResetPasswordArgs } from '../../../generated/wabe'
import { OTP } from '../../authentication/OTP'
import type { WabeContext } from '../../server/interface'
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
    fields: ['id'],
    first: 1,
    context: {
      ...context,
      isRoot: true,
    },
  })

  // We return true if the user doesn't exist to avoid leaking that the user exists or not
  if (user.length === 0) return true

  const userId = user[0].id

  const otpClass = new OTP(context.wabe.config.rootKey)

  if (
    (!otpClass.verify(otp, userId) && process.env.NODE_ENV === 'production') ||
    (process.env.NODE_ENV !== 'production' && otp !== '000000')
  )
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
    fields: [],
    context: {
      ...context,
      isRoot: true,
    },
  })

  return true
}
