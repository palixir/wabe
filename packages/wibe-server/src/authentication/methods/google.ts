import { WibeApp } from '../../server'
import { AuthenticationEventsOptions } from '../interface'

/*
Click on link on the front :
- Redirect to google
- Google redirect to an url with a code
*/

export const googleOnSignUp = async ({
	input,
	user,
	context,
}: AuthenticationEventsOptions) => {}

export const googleOnSignIn = async ({
	input,
	user,
	context,
}: AuthenticationEventsOptions) => {
	const port = WibeApp.config.port
	const clientId =
		WibeApp.config.authentication?.providers?.['GOOGLE']?.clientId
	const clientSecret =
		WibeApp.config.authentication?.providers?.['GOOGLE']?.clientSecret

	if (!clientId || !clientSecret)
		throw new Error('Client id or secret not found')

	const googleTokenResult = await fetch(
		'https://oauth2.googleapis.com/token',
		{
			method: 'POST',
			body: JSON.stringify({
				code: input.authorizationCode,
				client_id: clientId,
				client_secret: clientSecret,
				grant_type: 'authorization_code',
				redirect_uri: `http://127.0.0.1:${port}/auth/provider/google`,
			}),
			headers: {
				'Content-Type': 'application/json',
			},
		},
	)

	const { access_token, id_token, refresh_token } =
		await googleTokenResult.json()

	if (!refresh_token)
		throw new Error('Refresh token not found, access_type must be offline')

	if (!access_token || !id_token) throw new Error('Invalid token')

	const userRequest = await fetch(
		`https://www.googleapis.com/oauth2/v1/userinfo?alt=json&access_token=${access_token}`,
		{
			headers: {
				Authorization: `Bearer ${id_token}`,
			},
		},
	)

	const { email, verified_email } = await userRequest.json()

	if (!verified_email) throw new Error('Email not verified')

	return {
		identifier: id_token,
		accessToken: access_token,
		refreshToken: refresh_token,
		email,
		verifiedEmail: verified_email,
	}
}
