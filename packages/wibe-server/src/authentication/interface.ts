import { _User } from '../../generated/wibe'
import { Context } from '../graphql/interface'
import { TypeField } from '../schema'

export enum ProviderEnum {
	google = 'google',
	x = 'x',
}

export interface ProviderConfig {
	clientId: string
	clientSecret: string
}

export interface AuthenticationCallbackOutput {
	dataToStore: { refreshToken?: string; accessToken?: string }
	user: Partial<_User>
}

export interface AuthenticationEventsOptions {
	input: Record<string, any>
	context: Context
}

export interface ProviderInterface {
	// TODO: Add onOTP
	onSignIn: (
		options: AuthenticationEventsOptions,
	) => Promise<AuthenticationCallbackOutput>
	onSignUp: (
		options: AuthenticationEventsOptions,
	) => Promise<AuthenticationCallbackOutput>
}

export interface CustomAuthenticationMethods<T = Record<string, TypeField>> {
	name: string
	input: T
	dataToStore: T
	events: ProviderInterface
}

export interface AuthenticationConfig {
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
