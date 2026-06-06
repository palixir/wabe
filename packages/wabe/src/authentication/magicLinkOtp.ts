import { createHmac, randomInt, timingSafeEqual } from 'node:crypto'

const OTP_PATTERN = /^\d{6}$/

export const generateMagicLinkOtp = (): string => String(randomInt(0, 1_000_000)).padStart(6, '0')

export const hashMagicLinkOtp = (
	rootKey: string,
	email: string,
	challengeToken: string,
	otp: string,
): string => createHmac('sha256', rootKey).update(`${email}:${challengeToken}:${otp}`).digest('hex')

export const verifyMagicLinkOtp = (
	rootKey: string,
	email: string,
	challengeToken: string,
	otp: string,
	otpHash: string,
): boolean => {
	if (!OTP_PATTERN.test(otp)) return false

	const expected = hashMagicLinkOtp(rootKey, email, challengeToken, otp)

	try {
		return timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(otpHash, 'hex'))
	} catch {
		return false
	}
}

export const runDummyMagicLinkOtpWork = (rootKey: string) => {
	hashMagicLinkOtp(rootKey, 'dummy@example.com', '00000000-0000-0000-0000-000000000000', '000000')
}
