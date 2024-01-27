export enum ProviderEnum {
    GOOGLE = 'GOOGLE',
    X = 'X',
}

export interface ProviderConfig {
    clientId: string
    clientSecret: string
}

export interface AuthenticationConfig {
    successRedirectPath: string
    failureRedirectPath: string
    providers: Partial<Record<ProviderEnum, ProviderConfig>>
}

// Example of url to request in front end : https://accounts.google.com/o/oauth2/auth?client_id=${client_id}&redirect_uri=${'http://localhost:3000/auth/test'}&scope=${'email'}&response_type=code&access_type=offline

export interface ValidateTokenOptions {
    code: string
}

export interface Provider {
    validateTokenFromAuthorizationCode(
        options: ValidateTokenOptions,
    ): Promise<{ accessToken: string; refreshToken: string }>
}
