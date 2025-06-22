import { contextWithRoot } from '../..'
import { sendOtpCodeTemplate } from '../../email/templates/sendOtpCode'
import type { DevWabeTypes } from '../../utils/helper'
import type {
  OnSendChallengeOptions,
  OnVerifyChallengeOptions,
  SecondaryProviderInterface,
} from '../interface'
import { OTP } from '../OTP'

const DUMMY_USER_ID = '00000000-0000-0000-0000-000000000000'

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
      select: {
        authentication: true,
        role: true,
        secondFA: true,
        email: true,
        id: true,
        provider: true,
        isOauth: true,
        createdAt: true,
        updatedAt: true,
      },
      first: 1,
      context: contextWithRoot(context),
    })

    const realUser = users.length > 0 ? users[0] : null
    const userId = realUser?.id ?? DUMMY_USER_ID

    const isDevBypass =
      !context.wabe.config.isProduction &&
      input.otp === '000000' &&
      realUser !== null

    const otpClass = new OTP(context.wabe.config.rootKey)

    const isOtpValid = otpClass.verify(input.otp, userId)

    if (realUser && (isOtpValid || isDevBypass)) return { userId: realUser.id }

    return null
  }
}
