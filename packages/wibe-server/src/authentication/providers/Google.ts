import { WibeApp } from '../../server'
import { AuthenticationEventsOptions, ProviderInterface } from '../interface'
import { Google as GoogleOauth } from '../oauth/Google'

export class Google implements ProviderInterface {
	async _googleAuthentication({
		context,
		input,
	}: AuthenticationEventsOptions) {
		const { authorizationCode, codeVerifier } = input

		const googleOauth = new GoogleOauth()

		const {
			accessToken,
			refreshToken,
			accessTokenExpiresAt,
			refreshTokenExpiresAt,
			idToken,
		} = await googleOauth.validateAuthorizationCode(
			authorizationCode,
			codeVerifier,
		)

		if (!refreshToken || !refreshTokenExpiresAt)
			throw new Error('Access_type must be offline')

		if (!idToken) throw new Error('Authentication failed')

		const { email, verifiedEmail } = await googleOauth.getUserInfo(
			accessToken,
			idToken,
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
		const dataToStore = await this._googleAuthentication(options)

		// TODO : Use first 1 here
		const user = await WibeApp.databaseController.getObjects({
			className: '_User',
			where: {
				authentication: {
					// @ts-expect-error
					google: {
						email: { equalTo: options.input.email },
					},
				},
			},
		})

		return {
			user: user[0],
			dataToStore,
		}
	}

	async onSignUp(options: AuthenticationEventsOptions) {
		const dataToStore = await this._googleAuthentication(options)

		const user = await WibeApp.databaseController.createObject({
			className: '_User',
			data: {
				authentication: {
					google: {
						...options.input,
					},
				},
			},
			context: options.context,
		})

		return {
			user,
			dataToStore,
		}
	}
}
