import { contextWithRoot } from '../..'
import type { DevWabeTypes } from '../../utils/helper'
import type {
  OnVerifyChallengeOptions,
  SecondaryProviderInterface,
} from '../interface'
import { OTP } from '../OTP'

const DUMMY_USER_ID = '00000000-0000-0000-0000-000000000000'

type QRCodeOTPInterface = {
  email: string
  otp: string
}

export class QRCodeOTP
  implements SecondaryProviderInterface<DevWabeTypes, QRCodeOTPInterface>
{
  async onSendChallenge() {
    // The user should check the application and get the OTP code
  }

  async onVerifyChallenge({
    context,
    input,
  }: OnVerifyChallengeOptions<DevWabeTypes, QRCodeOTPInterface>) {
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
