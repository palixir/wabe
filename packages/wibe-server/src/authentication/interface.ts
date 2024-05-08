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

export type AuthenticationCallbackOutput<T> = {
	dataToStore: {
		refreshToken?: string
		accessToken?: string
		expireAt?: Date
	} & T
	user: Partial<_User>
}

export type AuthenticationEventsOptions<T> = {
	input: T
	context: Context
}

export type ProviderInterface<T> = {
	onSignIn: (
		options: AuthenticationEventsOptions<T>,
	) => Promise<AuthenticationCallbackOutput<T>>
	onSignUp: (
		options: AuthenticationEventsOptions<T>,
	) => Promise<AuthenticationCallbackOutput<T>>
	// onSecondaryFactorAuthentication?: (
	// 	options: AuthenticationEventsOptions<T>,
	// ) => Promise<AuthenticationCallbackOutput<T>>
}

export interface CustomAuthenticationMethods<T = Record<string, TypeField>> {
	name: string
	input: T
	dataToStore: T
	provider: ProviderInterface<T>
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
