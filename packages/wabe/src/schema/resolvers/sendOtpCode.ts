import { createHash } from 'node:crypto'
import { totp } from 'otplib'
import type { MutationSendOtpCodeArgs } from '../../../generated/wabe'
import type { WabeContext } from '../../server/interface'
import type { DevWabeTypes } from '../../utils/helper'
import { sendOtpCodeTemplate } from '../../email/templates/sendOtpCode'

export const sendOtpCodeResolver = async (
  _: any,
  { input }: MutationSendOtpCodeArgs,
  context: WabeContext<DevWabeTypes>,
) => {
  if (!context.user && !context.isRoot) throw new Error('Permission denied')

  const emailController = context.wabe.controllers.email

  if (!emailController) throw new Error('Email adapter not defined')

  const user = await context.wabe.controllers.database.getObjects({
    className: 'User',
    where: {
      email: {
        equalTo: input.email,
      },
    },
    fields: ['id'],
    first: 1,
    context,
  })

  if (user.length === 0) throw new Error('User not found')

  const userId = user[0].id

  const secret = context.wabe.config.rootKey

  const hashedSecret = createHash('sha256')
    .update(`${secret}:${userId}`)
    .digest('hex')

  const otp = totp.generate(hashedSecret)

  const mainEmail = context.wabe.config.email?.mainEmail || 'noreply@wabe.com'

  await emailController.send({
    from: mainEmail,
    to: [input.email],
    subject: 'Confirmation code',
    html: sendOtpCodeTemplate(otp),
  })

  return true
}
