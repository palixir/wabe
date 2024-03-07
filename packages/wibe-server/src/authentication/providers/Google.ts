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

		const { accessToken, refreshToken, accessTokenExpiresAt, idToken } =
			await googleOauth.validateAuthorizationCode(
				authorizationCode,
				codeVerifier,
			)

		if (!refreshToken) throw new Error('Access_type must be offline')

		if (!idToken) throw new Error('Authentication failed')

		const { email, verifiedEmail } = await googleOauth.getUserInfo(
			accessToken,
			idToken,
		)

		// Create cookie for access and refresh token
		context.cookie.accessToken.set({
			value: accessToken,
			httpOnly: true,
			path: '/',
			// TODO : Check for implements csrf token for sub-domain protection
			sameSite: 'strict',
			maxAge: accessTokenExpiresAt?.getTime(),
			secure: Bun.env.NODE_ENV === 'production',
		})

		context.cookie.refreshToken.set({
			value: refreshToken,
			httpOnly: true,
			path: '/',
			// TODO : Check for implements csrf token for sub-domain protection
			sameSite: 'strict',
			maxAge: Date.now() + 3600 * 24 * 60 * 1000, // 60 days
			secure: Bun.env.NODE_ENV === 'production',
		})

		const user = await WibeApp.databaseController.getObjects({
			className: '_User',
			where: {
				authentication: {
					// @ts-expect-error
					google: {
						email: { equalTo: email },
					},
				},
			},
		})

		const dataToStore = {
			accessToken,
			refreshToken,
			email,
			verifiedEmail,
			idToken,
		}

		if (user.length === 0) {
			const user = await WibeApp.databaseController.createObject({
				className: '_User',
				data: {
					authentication: {
						google: {
							...dataToStore,
						},
					},
				},
				context,
			})

			return {
				user,
				dataToStore,
			}
		}

		return {
			user: user[0],
			dataToStore,
		}
	}

	async onSignIn(options: AuthenticationEventsOptions) {
		return this._googleAuthentication(options)
	}

	async onSignUp(options: AuthenticationEventsOptions) {
		return this._googleAuthentication(options)
	}
}
