import { _User } from '../../generated/wibe'
import { Context } from '../graphql/interface'
import { TypeField } from '../schema'

export enum ProviderEnum {
	GOOGLE = 'GOOGLE',
	X = 'X',
}

export interface ProviderConfig {
	clientId: string
	clientSecret: string
}

export interface AuthenticationCallbackOutput {
	refreshToken?: string
	accessToken?: string
}

export interface AuthenticationEventsOptions {
	user: _User
	input: Record<string, any>
	context: Context
}

export interface CustomAuthenticationEvents {
	// TODO : Add onOTP
	onSignUp: (
		options: AuthenticationEventsOptions,
	) => Promise<AuthenticationCallbackOutput>
	onLogin: (
		options: AuthenticationEventsOptions,
	) => Promise<AuthenticationCallbackOutput>
}

export interface CustomAuthenticationMethods<T = Record<string, TypeField>> {
	name: string
	input: T
	events: CustomAuthenticationEvents
}

export interface AuthenticationConfig {
	successRedirectPath?: string
	failureRedirectPath?: string
	providers?: Partial<Record<ProviderEnum, ProviderConfig>>
	customAuthenticationMethods?: CustomAuthenticationMethods[]
}

// Example of url to request in front end : https://accounts.google.com/o/oauth2/auth?client_id=${client_id}&redirect_uri=${'http://localhost:3000/auth/test'}&scope=${'email'}&response_type=code&access_type=offline

export interface ValidateTokenOptions {
	code: string
}

export interface Provider {
	validateTokenFromAuthorizationCode(
		options: ValidateTokenOptions,
	): Promise<void>
}
