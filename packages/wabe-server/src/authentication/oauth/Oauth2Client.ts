// Code inspired by Oslo : https://github.com/pilcrowOnPaper/oslo/blob/main/src/oauth2/index.ts

import { base64URLencode } from './utils'

export interface TokenResponseBody {
	access_token: string
	token_type?: string
	expires_in?: number
	refresh_token?: string
	scope?: string
}

export class OAuth2Client {
	public clientId: string

	private authorizeEndpoint: string
	private tokenEndpoint: string
	private redirectURI: string

	constructor(
		clientId: string,
		authorizeEndpoint: string,
		tokenEndpoint: string,
		redirectURI: string,
	) {
		this.clientId = clientId
		this.authorizeEndpoint = authorizeEndpoint
		this.tokenEndpoint = tokenEndpoint
		this.redirectURI = redirectURI
	}

	async createAuthorizationURL(options?: {
		state?: string
		codeVerifier?: string
		scopes?: string[]
	}): Promise<URL> {
		const scopes = Array.from(new Set(options?.scopes || [])) // remove duplicates
		const authorizationUrl = new URL(this.authorizeEndpoint)
		authorizationUrl.searchParams.set('response_type', 'code')
		authorizationUrl.searchParams.set('client_id', this.clientId)

		if (options?.state !== undefined)
			authorizationUrl.searchParams.set('state', options.state)

		if (scopes.length > 0)
			authorizationUrl.searchParams.set('scope', scopes.join(' '))

		if (this.redirectURI !== null)
			authorizationUrl.searchParams.set('redirect_uri', this.redirectURI)

		if (options?.codeVerifier !== undefined) {
			const codeChallenge = base64URLencode(options.codeVerifier)

			authorizationUrl.searchParams.set('code_challenge_method', 'S256')
			authorizationUrl.searchParams.set('code_challenge', codeChallenge)
		}

		return authorizationUrl
	}

	async validateAuthorizationCode<
		_TokenResponseBody extends TokenResponseBody,
	>(
		authorizationCode: string,
		options?: {
			codeVerifier?: string
			credentials?: string
			authenticateWith?: 'http_basic_auth' | 'request_body'
		},
	): Promise<_TokenResponseBody> {
		const body = new URLSearchParams()
		body.set('code', authorizationCode)
		body.set('client_id', this.clientId)
		body.set('grant_type', 'authorization_code')

		if (this.redirectURI !== null)
			body.set('redirect_uri', this.redirectURI)

		if (options?.codeVerifier !== undefined)
			body.set('code_verifier', options.codeVerifier)

		return this._sendTokenRequest<_TokenResponseBody>(body, options)
	}

	async refreshAccessToken<_TokenResponseBody extends TokenResponseBody>(
		refreshToken: string,
		options?: {
			credentials?: string
			authenticateWith?: 'http_basic_auth' | 'request_body'
			scopes?: string[]
		},
	): Promise<_TokenResponseBody> {
		const body = new URLSearchParams()
		body.set('refresh_token', refreshToken)
		body.set('client_id', this.clientId)
		body.set('grant_type', 'refresh_token')

		const scopes = Array.from(new Set(options?.scopes ?? [])) // remove duplicates
		if (scopes.length > 0) body.set('scope', scopes.join(' '))

		return await this._sendTokenRequest<_TokenResponseBody>(body, options)
	}

	async _sendTokenRequest<_TokenResponseBody extends TokenResponseBody>(
		body: URLSearchParams,
		options?: {
			credentials?: string
			authenticateWith?: 'http_basic_auth' | 'request_body'
		},
	): Promise<_TokenResponseBody> {
		const headers = new Headers()
		headers.set('Content-Type', 'application/x-www-form-urlencoded')
		headers.set('Accept', 'application/json')
		headers.set('User-Agent', 'wibe')

		if (options?.credentials !== undefined) {
			const authenticateWith =
				options?.authenticateWith || 'http_basic_auth'
			if (authenticateWith === 'http_basic_auth') {
				const encodedCredentials = btoa(
					`${this.clientId}:${options.credentials}`,
				)
				headers.set('Authorization', `Basic ${encodedCredentials}`)
			} else {
				body.set('client_secret', options.credentials)
			}
		}

		const request = new Request(this.tokenEndpoint, {
			method: 'POST',
			headers,
			body,
		})

		const response = await fetch(request)
		const result: _TokenResponseBody = await response.json()

		// providers are allowed to return non-400 status code for errors
		if (
			!('access_token' in result) ||
			response.status !== 200 ||
			!response.ok
		)
			throw new Error('Error in token request')

		return result
	}
}
