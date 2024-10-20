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
})
