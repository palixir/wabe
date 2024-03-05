import { OAuth2Client } from '.'
import type { OAuth2ProviderWithPKCE, Tokens } from '.'

const authorizeEndpoint = 'https://accounts.google.com/o/oauth2/v2/auth'
const tokenEndpoint = 'https://oauth2.googleapis.com/token'

interface AuthorizationCodeResponseBody {
	access_token: string
	refresh_token?: string
	expires_in: number
	id_token: string
}

interface RefreshTokenResponseBody {
	access_token: string
	expires_in: number
}

export class Google implements OAuth2ProviderWithPKCE {
	private client: OAuth2Client
	private clientSecret: string

	constructor(clientId: string, clientSecret: string, redirectURI: string) {
		this.client = new OAuth2Client(
			clientId,
			authorizeEndpoint,
			tokenEndpoint,
			redirectURI,
		)
		this.clientSecret = clientSecret
	}

	async createAuthorizationURL(
		state: string,
		codeVerifier: string,
		options?: {
			scopes?: string[]
		},
	): Promise<URL> {
		const scopes = options?.scopes ?? []
		const url = await this.client.createAuthorizationURL({
			state,
			codeVerifier,
			scopes: [...scopes, 'openid'],
		})
		url.searchParams.set('nonce', '_')

		return url
	}

	async validateAuthorizationCode(
		code: string,
		codeVerifier: string,
	): Promise<Tokens> {
		const { access_token, expires_in, refresh_token, id_token } =
			await this.client.validateAuthorizationCode<AuthorizationCodeResponseBody>(
				code,
				{
					authenticateWith: 'request_body',
					credentials: this.clientSecret,
					codeVerifier,
				},
			)

		return {
			accessToken: access_token,
			refreshToken: refresh_token ?? null,
			accessTokenExpiresAt: new Date(Date.now() + expires_in * 1000),
			idToken: id_token,
		}
	}

	async refreshAccessToken(refreshToken: string): Promise<Tokens> {
		const { access_token, expires_in } =
			await this.client.refreshAccessToken<RefreshTokenResponseBody>(
				refreshToken,
				{
					authenticateWith: 'request_body',
					credentials: this.clientSecret,
				},
			)

		return {
			accessToken: access_token,
			accessTokenExpiresAt: new Date(Date.now() + expires_in * 1000),
		}
	}

	async getUserInfo(accessToken: string, idToken: string) {
		const userInfo = await fetch(
			`https://www.googleapis.com/oauth2/v1/userinfo?alt=json&access_token=${accessToken}`,
			{
				headers: {
					Authorization: `Bearer ${idToken}`,
				},
			},
		)

		const { email, verified_email } = await userInfo.json()

		return { email, verifiedEmail: verified_email }
	}
}
