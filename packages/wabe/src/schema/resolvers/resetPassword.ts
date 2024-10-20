import { createHash } from 'node:crypto'
import { totp } from 'otplib'
import type { MutationResetPasswordArgs } from '../../../generated/wabe'
import type { WabeContext } from '../../server/interface'
import type { DevWabeTypes } from '../../utils/helper'
import { hashPassword } from '../../authentication/utils'

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

  if (!totp.verify({ secret: hashedSecret, token: otp }))
    throw new Error('Invalid OTP code')

  await context.wabe.controllers.database.updateObject({
    className: 'User',
    id: userId,
    data: {
      authentication: {
        [provider]: {
          password: await hashPassword(password),
        },
      },
    },
    fields: [],
    context,
  })

  return true
}
