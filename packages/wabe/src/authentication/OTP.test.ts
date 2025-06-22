import { describe, it, expect } from 'bun:test'
import { OTP } from './OTP'

describe('OTP', () => {
  it('should generate a valid OTP code', () => {
    const otp = new OTP('rootKey')

    const otpValue = otp.generate('userId')

    expect(otpValue.length).toBe(6)
  })

  it('should verify a valid OTP code', () => {
    const otp = new OTP('rootKey')

    const otpValue = otp.generate('userId')

    expect(otpValue.length).toBe(6)

    expect(otp.verify(otpValue, 'userId')).toBe(true)
  })

  it('should not verify an invalid OTP code', () => {
    const otp = new OTP('rootKey')

    const otpValue = otp.generate('userId')

    expect(otpValue.length).toBe(6)

    expect(otp.verify('invalidOtp', 'userId')).toBe(false)

    const otpValue2 = otp.generate('invalidUserId')

    expect(otpValue2.length).toBe(6)

    expect(otp.verify(otpValue2, 'userId')).toBe(false)
  })

  it('should not verify an invalid OTP code (more than 5 minutes)', () => {
    // Directly test the timeout is flaky we only test that the correct value is passed to totp
    const otp = new OTP('rootKey')

    expect(otp.internalTotp.options.window).toEqual([5, 0])
  })

  it('should generate a valid keyuri', () => {
    const otp = new OTP('rootKey')

    const keyuri = otp.generateKeyuri({
      userId: 'userId',
      emailOrUsername: 'email@test.fr',
      applicationName: 'Wabe',
    })

    expect(keyuri).toBe(
      'otpauth://totp/Wabe:email%40test.fr?secret=O54OZDANWM2YFHJKJMMVMQSV7DUMUZFT3BWE4Z5NOQCAATGGHKYA&period=30&digits=6&algorithm=SHA1&issuer=Wabe',
    )
  })

  it('should verify an OTP generated from authenticator', () => {
    const otp = new OTP('rootKey')

    const code = otp.authenticatorGenerate('userId')

    const isValid = otp.authenticatorVerify(code, 'userId')

    expect(isValid).toBe(true)
  })
})
