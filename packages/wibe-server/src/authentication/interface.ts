import type { User } from '../../generated/wibe'
import type { WibeContext } from '../server/interface'
import type { TypeField } from '../schema'
import type { WibeAppTypes } from '../server'

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
	context: WibeContext<any>
}

export type ProviderInterface<T = any> = {
	onSignIn: (
		options: AuthenticationEventsOptions<T>,
	) => Promise<{ user: Partial<User> }>
	onSignUp: (
		options: AuthenticationEventsOptions<T>,
	) => Promise<{ authenticationDataToSave: any }>
}

export type SecondaryProviderInterface<T = any> = {
	onSendChallenge: () => Promise<void>
	onVerifyChallenge: (options: T) => Promise<boolean>
}

export type CustomAuthenticationMethods<
	T extends WibeAppTypes,
	U = ProviderInterface | SecondaryProviderInterface,
	K = Record<string, TypeField<T>>,
> = {
	name: string
	input: K
	provider: U
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

export interface AuthenticationConfig<T extends WibeAppTypes> {
	session?: SessionConfig
	roles?: RoleConfig
	successRedirectPath?: string
	failureRedirectPath?: string
	providers?: Partial<Record<ProviderEnum, ProviderConfig>>
	customAuthenticationMethods?: CustomAuthenticationMethods<T>[]
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
