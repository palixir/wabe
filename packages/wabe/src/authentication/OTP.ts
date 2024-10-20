import { totp } from 'otplib'
import type { TOTP } from 'otplib/core'
import { createHash } from 'node:crypto'

const FIVE_MINUTES = 5

export class OTP {
  private secret: string
  public internalTotp: TOTP

  constructor(rootKey: string) {
    this.secret = rootKey
    this.internalTotp = totp.clone({
      window: [FIVE_MINUTES, 0],
    })
  }

  generate(userId: string): string {
    const hashedSecret = createHash('sha256')
      .update(`${this.secret}:${userId}`)
      .digest('hex')

    return this.internalTotp.generate(hashedSecret)
  }

  verify(otp: string, userId: string): boolean {
    const hashedSecret = createHash('sha256')
      .update(`${this.secret}:${userId}`)
      .digest('hex')

    return this.internalTotp.verify({ secret: hashedSecret, token: otp })
  }
}
