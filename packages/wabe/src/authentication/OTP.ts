import { totp, authenticator } from 'otplib'
import type { TOTP } from 'otplib/core'
import { createHash, randomBytes } from 'node:crypto'
import { base32Encode } from 'src/utils'
import type { WabeContext } from '../server/interface'
import { contextWithRoot } from '../utils/export'

const ONE_WINDOW = 1

export const generateOtpSalt = (): string => randomBytes(32).toString('hex')

export const getOrCreateOtpSalt = async (
	context: WabeContext<any>,
	userId: string,
): Promise<string> => {
	const rootContext = contextWithRoot(context)
	const user = await context.wabe.controllers.database.getObject({
		className: 'User',
		id: userId,
		context: rootContext,
		select: { otpSalt: true },
	})

	if (user?.otpSalt) return user.otpSalt as string

	const salt = generateOtpSalt()
	await context.wabe.controllers.database.updateObject({
		className: 'User',
		id: userId,
		context: rootContext,
		data: { otpSalt: salt },
		select: {},
	})

	return salt
}

export class OTP {
	private secret: string
	public internalTotp: TOTP

	constructor(rootKey: string) {
		this.secret = rootKey
		this.internalTotp = totp.clone({
			window: [ONE_WINDOW, 0],
		})
	}

	deriveSecret(userId: string, salt?: string): string {
		const material = salt ? `${this.secret}:${userId}:${salt}` : `${this.secret}:${userId}`
		const hash = createHash('sha256').update(material).digest()

		return base32Encode(hash, 'RFC4648', { padding: false })
	}

	generate(userId: string, salt?: string): string {
		const secret = this.deriveSecret(userId, salt)

		return this.internalTotp.generate(secret)
	}

	verify(otp: string, userId: string, salt?: string): boolean {
		const secret = this.deriveSecret(userId, salt)

		return this.internalTotp.verify({ secret, token: otp })
	}

	authenticatorGenerate(userId: string, salt?: string): string {
		const secret = this.deriveSecret(userId, salt)
		return authenticator.generate(secret)
	}

	authenticatorVerify(otp: string, userId: string, salt?: string): boolean {
		const secret = this.deriveSecret(userId, salt)

		return authenticator.verify({
			secret,
			token: otp,
		})
	}

	generateKeyuri({
		userId,
		emailOrUsername,
		applicationName,
		salt,
	}: {
		userId: string
		emailOrUsername: string
		applicationName: string
		salt?: string
	}): string {
		const secret = this.deriveSecret(userId, salt)

		return authenticator.keyuri(emailOrUsername, applicationName, secret)
	}
}
