import { describe, it, expect } from 'bun:test'
import { OTP, generateOtpSalt } from './OTP'

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

		expect(otp.internalTotp.options.window).toEqual([1, 0])
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

	it('should produce different secrets with different salts', () => {
		const otp = new OTP('rootKey')

		const secretNoSalt = otp.deriveSecret('userId')
		const secretWithSaltA = otp.deriveSecret('userId', 'saltA')
		const secretWithSaltB = otp.deriveSecret('userId', 'saltB')

		expect(secretNoSalt).not.toEqual(secretWithSaltA)
		expect(secretWithSaltA).not.toEqual(secretWithSaltB)
	})

	it('should verify OTP code generated with the same salt', () => {
		const otp = new OTP('rootKey')
		const salt = 'per-user-salt-value'

		const code = otp.generate('userId', salt)
		expect(otp.verify(code, 'userId', salt)).toBe(true)
	})

	it('should not verify OTP code generated with a different salt', () => {
		const otp = new OTP('rootKey')

		const code = otp.generate('userId', 'saltA')
		expect(otp.verify(code, 'userId', 'saltB')).toBe(false)
	})

	it('should not verify OTP without salt when generated with salt', () => {
		const otp = new OTP('rootKey')

		const code = otp.generate('userId', 'mySalt')
		expect(otp.verify(code, 'userId')).toBe(false)
	})

	it('should verify authenticator OTP with matching salt', () => {
		const otp = new OTP('rootKey')
		const salt = 'authenticator-salt'

		const code = otp.authenticatorGenerate('userId', salt)
		expect(otp.authenticatorVerify(code, 'userId', salt)).toBe(true)
		expect(otp.authenticatorVerify(code, 'userId', 'wrongSalt')).toBe(false)
	})

	it('should generate unique salts via generateOtpSalt', () => {
		const salt1 = generateOtpSalt()
		const salt2 = generateOtpSalt()

		expect(salt1).toBeString()
		expect(salt1.length).toBe(64)
		expect(salt1).not.toEqual(salt2)
	})

	it('should include salt in keyuri derivation', () => {
		const otp = new OTP('rootKey')

		const keyuriNoSalt = otp.generateKeyuri({
			userId: 'userId',
			emailOrUsername: 'email@test.fr',
			applicationName: 'Wabe',
		})

		const keyuriWithSalt = otp.generateKeyuri({
			userId: 'userId',
			emailOrUsername: 'email@test.fr',
			applicationName: 'Wabe',
			salt: 'userSalt',
		})

		expect(keyuriNoSalt).not.toEqual(keyuriWithSalt)
	})
})
