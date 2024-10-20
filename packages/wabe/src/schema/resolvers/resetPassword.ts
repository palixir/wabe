import { createHash } from 'node:crypto'
import { totp } from 'otplib'
import type { MutationResetPasswordArgs } from '../../../generated/wabe'
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
    context,
  })

  if (user.length === 0) throw new Error('User not found')

  const userId = user[0].id

  const secret = context.wabe.config.internalConfig.otpSecret

  const hashedSecret = createHash('sha256')
    .update(`${secret}:${userId}`)
    .digest('hex')

  if (
    (!totp.verify({ secret: hashedSecret, token: otp }) &&
      process.env.NODE_ENV === 'production') ||
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
    context,
  })

  return true
}
