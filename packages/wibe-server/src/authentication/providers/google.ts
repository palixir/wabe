import { gql } from 'graphql-request'
import { WibeApp } from '../../server'
import { getGraphqlClient } from '../../utils/helper'
import { Provider } from '../interface'

export class GoogleProvider implements Provider {
	private clientId: string
	private clientSecret: string

	constructor(clientId: string, clientSecret: string) {
		this.clientId = clientId
		this.clientSecret = clientSecret

		console.log('CONSTRUCTOR')
	}

	async validateTokenFromAuthorizationCode(code: string) {
		const wibeConfig = WibeApp.config

		const res = await fetch('https://oauth2.googleapis.com/token', {
			method: 'POST',
			body: JSON.stringify({
				code,
				client_id: this.clientId,
				client_secret: this.clientSecret,
				grant_type: 'authorization_code',
				redirect_uri: `http://127.0.0.1:${wibeConfig.port}/auth/provider/google`,
			}),
			headers: {
				'Content-Type': 'application/json',
			},
		})

		const { access_token, id_token, refresh_token } = await res.json()

		if (!refresh_token)
			throw new Error(
				'Refresh token not found, access_type must be offline',
			)

		if (!access_token || !id_token) throw new Error('Invalid token')

		const user = await fetch(
			`https://www.googleapis.com/oauth2/v1/userinfo?alt=json&access_token=${access_token}`,
			{
				headers: {
					Authorization: `Bearer ${id_token}`,
				},
			},
		)

		const { email, verified_email } = await user.json()

		if (!verified_email) throw new Error('Email not verified')

		const client = getGraphqlClient(wibeConfig.port)

		await client.request<any>(gql`
			mutation signInWithProvider {
				signInWithProvider(
					email: "${email}"
					verifiedEmail: ${verified_email}
					provider: "GOOGLE"
					refreshToken: "${refresh_token}"
					accessToken: "${access_token}"
				)
			}
		`)

		return {
			accessToken: access_token,
			refreshToken: refresh_token,
		}
	}
}
