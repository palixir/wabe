import { WibeApp } from '../../server'
import {
	AuthenticationEventsOptions,
	AuthenticationInterface,
} from '../interface'
import { Google as GoogleOauth } from '../oauth/Google'

export class Google implements AuthenticationInterface {
	constructor() {}

	async _googleAuthentication({
		context,
		input,
	}: AuthenticationEventsOptions) {
		const { authorizationCode, codeVerifier } = input

		const googleConfig = WibeApp.config.authentication?.providers?.google

		if (!googleConfig) throw new Error('Google config not found')

		const { clientId, clientSecret } = googleConfig

		const googleOauth = new GoogleOauth(
			clientId,
			clientSecret,
			`http://127.0.0.1:${WibeApp.config.port}/auth/provider/google`,
		)

		const {
			accessToken,
			refreshToken,
			accessTokenExpiresAt,
			refreshTokenExpiresAt,
		} = await googleOauth.validateAuthorizationCode(
			authorizationCode,
			codeVerifier,
		)

		// Create cookie for access and refresh token
		context.cookie.accessToken.add({
			value: accessToken,
			httpOnly: true,
			path: '/',
			// TODO : Check for implements csrf token for sub-domain protection
			sameSite: 'strict',
			expires: accessTokenExpiresAt,
			secure: Bun.env.NODE_ENV === 'production',
		})

		context.cookie.refreshToken.add({
			value: refreshToken,
			httpOnly: true,
			path: '/',
			// TODO : Check for implements csrf token for sub-domain protection
			sameSite: 'strict',
			expires: refreshTokenExpiresAt,
			secure: Bun.env.NODE_ENV === 'production',
		})

		return {
			accessToken,
			refreshToken,
			email,
			verifiedEmail,
		}
	}

	async onSignIn(options: AuthenticationEventsOptions) {
		return this._googleAuthentication(options)
	}

	async onSignUp(options: AuthenticationEventsOptions) {
		return this._googleAuthentication(options)
	}
}
