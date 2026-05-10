import { OAuth2Client } from '.'
import type { WabeConfig } from '../../server'
import type { OAuthUserInfo } from './Oauth2Client'
import type { OAuth2ProviderWithPKCE, Tokens } from './utils'

const authorizeEndpoint = 'https://github.com/login/oauth/authorize'
const tokenEndpoint = 'https://github.com/login/oauth/access_token'

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

interface GitHubUser {
	id?: number
	login?: string
	avatar_url?: string
}

interface GitHubUserEmail {
	email?: string
	primary?: boolean
	verified?: boolean
}

export class GitHub implements OAuth2ProviderWithPKCE {
	private client: OAuth2Client
	private clientSecret: string

	constructor(config: WabeConfig<any>) {
		const githubConfig = config.authentication?.providers?.github

		if (!githubConfig) throw new Error('GitHub config not found')

		const baseUrl = `http${config.isProduction ? 's' : ''}://${config.authentication?.backDomain || '127.0.0.1:' + config.port || 3001}`

		const redirectURI = `${baseUrl}/auth/oauth/callback`

		this.client = new OAuth2Client(
			githubConfig.clientId,
			authorizeEndpoint,
			tokenEndpoint,
			redirectURI,
		)

		this.clientSecret = githubConfig.clientSecret
	}

	createAuthorizationURL(
		state: string,
		codeVerifier: string,
		options?: {
			scopes?: string[]
		},
	): URL {
		const scopes = options?.scopes ?? []
		const url = this.client.createAuthorizationURL({
			state,
			codeVerifier,
			scopes: [...scopes, 'read:user', 'user:email'],
		})

		url.searchParams.set('access_type', 'offline')
		url.searchParams.set('prompt', 'select_account')

		return url
	}

	async validateAuthorizationCode(code: string, codeVerifier: string): Promise<Tokens> {
		const { access_token, expires_in, refresh_token, id_token } =
			await this.client.validateAuthorizationCode<AuthorizationCodeResponseBody>(code, {
				authenticateWith: 'request_body',
				codeVerifier,
				credentials: this.clientSecret,
			})

		return {
			accessToken: access_token,
			refreshToken: refresh_token,
			accessTokenExpiresAt: new Date(Date.now() + expires_in * 1000),
			idToken: id_token,
		}
	}

	async refreshAccessToken(refreshToken: string): Promise<Tokens> {
		const { access_token, expires_in } =
			await this.client.refreshAccessToken<RefreshTokenResponseBody>(refreshToken, {
				authenticateWith: 'request_body',
				credentials: this.clientSecret,
			})

		return {
			accessToken: access_token,
			accessTokenExpiresAt: new Date(Date.now() + expires_in * 1000),
		}
	}

	async getUserInfo(accessToken: string): Promise<OAuthUserInfo> {
		const userInfoResponse = await fetch('https://api.github.com/user', {
			headers: {
				Authorization: `Bearer ${accessToken}`,
				Accept: 'application/vnd.github.v3+json',
			},
		})

		const userEmailResponse = await fetch('https://api.github.com/user/emails', {
			headers: {
				Authorization: `Bearer ${accessToken}`,
				Accept: 'application/vnd.github.v3+json',
			},
		})

		if (!userInfoResponse.ok || !userEmailResponse.ok)
			throw new Error('Failed to fetch user information from GitHub')

		const userInfo = (await userInfoResponse.json()) as GitHubUser
		const userEmails = (await userEmailResponse.json()) as GitHubUserEmail[]

		const preferredEmail =
			userEmails.find((email) => email.primary && email.verified)?.email ||
			userEmails.find((email) => email.verified)?.email ||
			userEmails.find((email) => email.primary)?.email ||
			null

		const preferredLower = preferredEmail?.toLowerCase() ?? null
		const verifiedEmail = Boolean(
			preferredLower &&
			userEmails.some(
				(entry) => entry.email?.toLowerCase() === preferredLower && entry.verified === true,
			),
		)

		return {
			providerUserId: userInfo.id ? String(userInfo.id) : null,
			email: preferredLower,
			username: userInfo.login || null,
			avatarUrl: userInfo.avatar_url || null,
			verifiedEmail,
		}
	}
}
