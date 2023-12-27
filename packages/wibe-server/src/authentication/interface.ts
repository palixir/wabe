export enum ProviderEnum {
	GOOGLE = 'GOOGLE',
}

export interface ProviderConfig {
	clientId: string
	clientSecret: string
}

export interface AuthenticationConfig {
	successRedirectPath: string
	failureRedirectPath: string
	providers: Record<ProviderEnum, ProviderConfig>
}

// Example of url to request in front end : https://accounts.google.com/o/oauth2/auth?client_id=${client_id}&redirect_uri=${'http://localhost:3000/auth/test'}&scope=${'email'}&response_type=code&access_type=offline

export interface Provider {
	validateTokenFromAuthorizationCode(
		code: string,
	): Promise<{ accessToken: string; refreshToken: string }>
}
