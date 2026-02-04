import { totp, authenticator } from 'otplib'
import type { TOTP } from 'otplib/core'
import { createHash } from 'node:crypto'
import { base32Encode } from 'src/utils'

const ONE_WINDOW = 1

export class OTP {
	private secret: string
	public internalTotp: TOTP

	constructor(rootKey: string) {
		this.secret = rootKey
		this.internalTotp = totp.clone({
			window: [ONE_WINDOW, 0],
		})
	}

	deriveSecret(userId: string): string {
		const hash = createHash('sha256').update(`${this.secret}:${userId}`).digest()

		return base32Encode(hash, 'RFC4648', { padding: false })
	}

	generate(userId: string): string {
		const secret = this.deriveSecret(userId)

		return this.internalTotp.generate(secret)
	}

	verify(otp: string, userId: string): boolean {
		const secret = this.deriveSecret(userId)

		return this.internalTotp.verify({ secret, token: otp })
	}

	authenticatorGenerate(userId: string): string {
		const secret = this.deriveSecret(userId)
		return authenticator.generate(secret)
	}

	authenticatorVerify(otp: string, userId: string): boolean {
		const secret = this.deriveSecret(userId)

		return authenticator.verify({
			secret,
			token: otp,
		})
	}

	generateKeyuri({
		userId,
		emailOrUsername,
		applicationName,
	}: {
		userId: string
		emailOrUsername: string
		applicationName: string
	}): string {
		const secret = this.deriveSecret(userId)

		return authenticator.keyuri(emailOrUsername, applicationName, secret)
	}
}
