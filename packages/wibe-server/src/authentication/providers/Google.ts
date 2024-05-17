import { WibeApp } from '../../server'
import { AuthenticationEventsOptions, ProviderInterface } from '../interface'
import { Google as GoogleOauth } from '../oauth/Google'

type GoogleInterface = {
	authorizationCode: string
	codeVerifier: string
}

export class Google implements ProviderInterface<GoogleInterface> {
	name = 'google'
	async _googleAuthentication({
		context,
		input,
	}: AuthenticationEventsOptions<GoogleInterface>) {
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
			expireAt: accessTokenExpiresAt,
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

	async onSignIn(options: AuthenticationEventsOptions<GoogleInterface>) {
		return this._googleAuthentication(options)
	}

	async onSignUp(options: AuthenticationEventsOptions<GoogleInterface>) {
		return this._googleAuthentication(options)
	}
}
