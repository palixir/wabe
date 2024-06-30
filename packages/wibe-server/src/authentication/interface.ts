import type { User } from '../generated/wibe'
import type { Context } from '../server/interface'
import type { TypeField } from '../schema'

export enum ProviderEnum {
	google = 'google',
	x = 'x',
}

export interface ProviderConfig {
	clientId: string
	clientSecret: string
}

export type AuthenticationEventsOptions<T> = {
	input: T
	context: Context
}

export type ProviderInterface<T = any> = {
	onSignIn: (
		options: AuthenticationEventsOptions<T>,
	) => Promise<{ user: Partial<User> }>
	onSignUp: (
		options: AuthenticationEventsOptions<T>,
	) => Promise<{ authenticationDataToSave: T }>
}

export type SecondaryProviderInterface<T = any> = {
	onSendChallenge: () => Promise<void>
	onVerifyChallenge: (options: T) => Promise<boolean>
}

export type CustomAuthenticationMethods<
	K = ProviderInterface | SecondaryProviderInterface,
	T = Record<string, TypeField>,
> = {
	name: string
	input: T
	provider: K
	isSecondaryFactor?: boolean
}

export type RoleConfig = Array<string>

export interface SessionConfig {
	/**
	 * The time in milliseconds that the access token will expire
	 */
	accessTokenExpiresIn?: number
	/**
	 * The time in milliseconds that the refresh token will expire
	 */
	refreshTokenExpiresIn?: number
	/**
	 * Set to true to automatically store the session tokens in cookies
	 */
	cookieSession?: boolean
}

export interface AuthenticationConfig {
	session?: SessionConfig
	roles?: RoleConfig
	successRedirectPath?: string
	failureRedirectPath?: string
	providers?: Partial<Record<ProviderEnum, ProviderConfig>>
	customAuthenticationMethods?: CustomAuthenticationMethods[]
}

// Example of url to request in front end : https://accounts.google.com/o/oauth2/auth?client_id=${client_id}&redirect_uri=${'http://localhost:3000/auth/test'}&scope=${'email'}&response_type=code&access_type=offline

export interface CreateTokenFromAuthorizationCodeOptions {
	code: string
}

export interface refreshTokenOptions {
	refreshToken: string
}

export interface Provider {
	createTokenFromAuthorizationCode(
		options: CreateTokenFromAuthorizationCodeOptions,
	): Promise<void>
	refreshToken(options: refreshTokenOptions): Promise<void>
}
