import { describe, expect, it } from 'bun:test'
import { generateMagicLinkOtp, hashMagicLinkOtp, verifyMagicLinkOtp } from './magicLinkOtp'

describe('magicLinkOtp', () => {
	it('should generate a 6-digit OTP', () => {
		const otp = generateMagicLinkOtp()
		expect(otp).toMatch(/^\d{6}$/)
	})

	it('should verify a valid OTP hash', () => {
		const rootKey = 'test-root-key'
		const email = 'user@example.com'
		const token = 'challenge-token'
		const otp = '123456'
		const hash = hashMagicLinkOtp(rootKey, email, token, otp)

		expect(verifyMagicLinkOtp(rootKey, email, token, otp, hash)).toBe(true)
	})

	it('should reject invalid OTP', () => {
		const rootKey = 'test-root-key'
		const email = 'user@example.com'
		const token = 'challenge-token'
		const hash = hashMagicLinkOtp(rootKey, email, token, '123456')

		expect(verifyMagicLinkOtp(rootKey, email, token, '654321', hash)).toBe(false)
	})

	it('should reject malformed OTP', () => {
		const rootKey = 'test-root-key'
		const hash = hashMagicLinkOtp(rootKey, 'a@b.c', 'token', '123456')

		expect(verifyMagicLinkOtp(rootKey, 'a@b.c', 'token', '12ab56', hash)).toBe(false)
	})
})
