import type { User } from '../../generated/wabe'
import type { WabeContext } from '../server/interface'
import type { SchemaFields } from '../schema'
import type { WabeTypes, WobeCustomContext } from '../server'
import type { SelectType } from '../database/interface'

export enum ProviderEnum {
	google = 'google',
	github = 'github',
}

export interface ProviderConfig {
	clientId: string
	clientSecret: string
}

export type AuthenticationEventsOptions<T extends WabeTypes, K> = {
	context: WabeContext<T>
	input: K
}

export type AuthenticationEventsOptionsWithUserId<
	T extends WabeTypes,
	K,
> = AuthenticationEventsOptions<T, K> & {
	userId: string
}

export type OnSendChallengeOptions<T extends WabeTypes> = {
	context: WabeContext<T>
	user: T['types']['User']
}

export type OnVerifyChallengeOptions<T extends WabeTypes, K> = {
	context: WabeContext<T>
	input: K
}

export type ProviderInterface<T extends WabeTypes, K = any> = {
	onSignIn: (options: AuthenticationEventsOptions<T, K>) => Promise<{
		user: Partial<User>
		srp?: {
			salt: string
			serverPublic: string
		}
	}>
	onSignUp: (
		options: AuthenticationEventsOptions<T, K>,
	) => Promise<{ authenticationDataToSave: any }>
	onUpdateAuthenticationData?: (
		options: AuthenticationEventsOptionsWithUserId<T, K>,
	) => Promise<{ authenticationDataToSave: any }>
}

export type SecondaryProviderInterface<T extends WabeTypes, K = any> = {
	onSendChallenge?: (options: OnSendChallengeOptions<T>) => Promise<void> | void
	onVerifyChallenge: (options: OnVerifyChallengeOptions<T, K>) =>
		| Promise<{
				userId: string
				srp?: { serverSessionProof: string }
		  } | null>
		| ({ userId: string; srp?: { serverSessionProof: string } } | null)
}

export type CustomAuthenticationMethods<
	T extends WabeTypes,
	U = ProviderInterface<T> | SecondaryProviderInterface<T>,
	K = SchemaFields<T>,
	W = SchemaFields<T>,
> = {
	name: string
	input: K
	dataToStore?: W
	provider: U
	isSecondaryFactor?: boolean
}

export type RoleConfig = Array<string>

export interface SessionConfig<T extends WabeTypes> {
	/**
	 * The time in milliseconds that the access token will expire
	 */
	accessTokenExpiresInMs?: number
	/**
	 * The time in milliseconds that the refresh token will expire
	 */
	refreshTokenExpiresInMs?: number
	/**
	 * Set to true to automatically store the session tokens in cookies
	 */
	cookieSession?: boolean
	/**
	 * The JWT secret used to sign the session tokens
	 */
	jwtSecret: string
	/**
	 * Optional audience to embed and verify in JWTs
	 */
	jwtAudience?: string
	/**
	 * Optional issuer to embed and verify in JWTs
	 */
	jwtIssuer?: string
	/**
	 * Secret dedicated to CSRF token HMAC (defaults to jwtSecret)
	 */
	csrfSecret?: string
	/**
	 * Secret used to encrypt session tokens at rest (defaults to jwtSecret)
	 */
	tokenSecret?: string
	/**
	 * A selection of fields to include in the JWT token in the "user" fields
	 */
	jwtTokenFields?: SelectType<T, 'User', keyof T['types']['User']>
}

export interface AuthenticationRateLimitConfig {
	/**
	 * Enable this rate limiter. Enabled by default in production.
	 */
	enabled?: boolean
	maxAttempts?: number
	windowMs?: number
	blockDurationMs?: number
}

export interface AuthenticationSecurityConfig {
	signInRateLimit?: AuthenticationRateLimitConfig
	signUpRateLimit?: AuthenticationRateLimitConfig
	verifyChallengeRateLimit?: AuthenticationRateLimitConfig
	mfaChallengeTtlMs?: number
	/**
	 * Require a valid challenge token during verifyChallenge in production.
	 */
	requireMfaChallengeInProduction?: boolean
}

export interface AuthenticationConfig<T extends WabeTypes> {
	session?: SessionConfig<T>
	roles?: RoleConfig
	successRedirectPath?: string
	failureRedirectPath?: string
	frontDomain?: string
	backDomain?: string
	providers?: Partial<Record<ProviderEnum, ProviderConfig>>
	customAuthenticationMethods?: CustomAuthenticationMethods<T>[]
	sessionHandler?: (context: WobeCustomContext<T>) => void | Promise<void>
	disableSignUp?: boolean
	security?: AuthenticationSecurityConfig
}

export interface CreateTokenFromAuthorizationCodeOptions {
	code: string
}

export interface refreshTokenOptions {
	refreshToken: string
}

export interface Provider {
	createTokenFromAuthorizationCode(options: CreateTokenFromAuthorizationCodeOptions): Promise<void>
	refreshToken(options: refreshTokenOptions): Promise<void>
}

export enum AuthenticationProvider {
	GitHub = 'github',
	Google = 'google',
	EmailPassword = 'emailPassword',
	PhonePassword = 'phonePassword',
}

export enum SecondaryFactor {
	EmailOTP = 'emailOTP',
	QRCodeOTP = 'qrcodeOTP',
}
