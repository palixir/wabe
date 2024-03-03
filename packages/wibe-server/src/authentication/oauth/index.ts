export interface Tokens {
	accessToken: string
	refreshToken?: string | null
	accessTokenExpiresAt?: Date
	refreshTokenExpiresAt?: Date | null
	idToken?: string
}

export interface OAuth2ProviderWithPKCE {
	createAuthorizationURL(state: string, codeVerifier: string): Promise<URL>
	validateAuthorizationCode(
		code: string,
		codeVerifier: string,
	): Promise<Tokens>
	refreshAccessToken?(refreshToken: string): Promise<Tokens>
}

export * from './Oauth2Client'
