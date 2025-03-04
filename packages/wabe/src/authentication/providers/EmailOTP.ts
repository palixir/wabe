import { contextWithRoot } from '../..'
import { sendOtpCodeTemplate } from '../../email/templates/sendOtpCode'
import type { DevWabeTypes } from '../../utils/helper'
import type {
  OnSendChallengeOptions,
  OnVerifyChallengeOptions,
  SecondaryProviderInterface,
} from '../interface'
import { OTP } from '../OTP'

type EmailOTPInterface = {
  email: string
  otp: string
}

export class EmailOTP
  implements SecondaryProviderInterface<DevWabeTypes, EmailOTPInterface>
{
  async onSendChallenge({
    context,
    user,
  }: OnSendChallengeOptions<DevWabeTypes>) {
    const emailController = context.wabe.controllers.email

    if (!emailController) throw new Error('Email controller not found')

    const mainEmail = context.wabe.config.email?.mainEmail

    if (!mainEmail) throw new Error('No main email found')

    if (!user.email) throw new Error('No user email found')

    const otpClass = new OTP(context.wabe.config.rootKey)

    const otp = otpClass.generate(user.id)

    const template = context.wabe.config.email?.htmlTemplates?.sendOTPCode

    await emailController.send({
      from: mainEmail,
      to: [user.email],
      subject: template?.subject || 'Your OTP code',
      html: template?.fn
        ? await template.fn({ otp })
        : sendOtpCodeTemplate(otp),
    })
  }

  async onVerifyChallenge({
    context,
    input,
  }: OnVerifyChallengeOptions<DevWabeTypes, EmailOTPInterface>) {
    const users = await context.wabe.controllers.database.getObjects({
      className: 'User',
      where: {
        email: {
          equalTo: input.email,
        },
      },
      select: { id: true, secondFA: true },
      first: 1,
      context: contextWithRoot(context),
    })

    if (users.length === 0) return null

    const user = users[0]

    if (!user) return null

    const userId = user.id

    if (!userId) return null

    const otpClass = new OTP(context.wabe.config.rootKey)

    if (!context.wabe.config.isProduction && input.otp === '000000')
      return { userId }

    if (!otpClass.verify(input.otp, userId)) return null

    return { userId }
  }
}
