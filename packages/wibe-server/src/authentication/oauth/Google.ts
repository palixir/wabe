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
		const result =
			await this.client.validateAuthorizationCode<AuthorizationCodeResponseBody>(
				code,
				{
					authenticateWith: 'request_body',
					credentials: this.clientSecret,
					codeVerifier,
				},
			)
		const tokens: Tokens = {
			accessToken: result.access_token,
			refreshToken: result.refresh_token ?? null,
			accessTokenExpiresAt: new Date(
				Date.now() + result.expires_in * 1000,
			),
			idToken: result.id_token,
		}
		return tokens
	}

	async refreshAccessToken(refreshToken: string): Promise<Tokens> {
		const result =
			await this.client.refreshAccessToken<RefreshTokenResponseBody>(
				refreshToken,
				{
					authenticateWith: 'request_body',
					credentials: this.clientSecret,
				},
			)

		return {
			accessToken: result.access_token,
			accessTokenExpiresAt: new Date(
				Date.now() + result.expires_in * 1000,
			),
		}
	}
}
