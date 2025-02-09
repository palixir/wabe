import type { MutationSendOtpCodeArgs } from '../../../generated/wabe'
import type { WabeContext } from '../../server/interface'
import type { DevWabeTypes } from '../../utils/helper'
import { sendOtpCodeTemplate } from '../../email/templates/sendOtpCode'
import { OTP } from '../../authentication/OTP'
import { contextWithRoot } from '../../utils/export'

export const sendOtpCodeResolver = async (
  _: any,
  { input }: MutationSendOtpCodeArgs,
  context: WabeContext<DevWabeTypes>,
) => {
  const emailController = context.wabe.controllers.email

  if (!emailController) throw new Error('Email adapter not defined')

  const user = await context.wabe.controllers.database.getObjects({
    className: 'User',
    where: {
      email: {
        equalTo: input.email,
      },
    },
    select: {id :true},
    first: 1,
    context: contextWithRoot(context),
  })

  // We return true if the user doesn't exist to avoid leaking that the user exists or not
  if (user.length === 0) return true

  const userId = user[0]?.id

  if (!userId) return false

  const otpClass = new OTP(context.wabe.config.rootKey)

  const otp = otpClass.generate(userId)

  const mainEmail = context.wabe.config.email?.mainEmail || 'noreply@wabe.com'

  const template =
    (await context.wabe.config.email?.htmlTemplates?.sendOTPCode({ otp })) ||
    sendOtpCodeTemplate(otp)

  await emailController.send({
    from: mainEmail,
    to: [input.email],
    subject: 'Confirmation code',
    html: template,
  })

  return true
}
