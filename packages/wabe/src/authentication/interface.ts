import type { User } from '../../generated/wabe'
import type { WabeContext } from '../server/interface'
import type { SchemaFields } from '../schema'
import type { WabeTypes, WobeCustomContext } from '../server'

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
  }>
  onSignUp: (
    options: AuthenticationEventsOptions<T, K>,
  ) => Promise<{ authenticationDataToSave: any }>
  onUpdateAuthenticationData?: (
    options: AuthenticationEventsOptionsWithUserId<T, K>,
  ) => Promise<{ authenticationDataToSave: any }>
}

export type SecondaryProviderInterface<T extends WabeTypes, K = any> = {
  onSendChallenge: (options: OnSendChallengeOptions<T>) => Promise<void> | void
  onVerifyChallenge: (
    options: OnVerifyChallengeOptions<T, K>,
  ) => Promise<{ userId: string } | null> | ({ userId: string } | null)
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

export interface SessionConfig {
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
}

export interface AuthenticationConfig<T extends WabeTypes> {
  session?: SessionConfig
  roles?: RoleConfig
  successRedirectPath?: string
  failureRedirectPath?: string
  frontDomain?: string
  backDomain?: string
  providers?: Partial<Record<ProviderEnum, ProviderConfig>>
  customAuthenticationMethods?: CustomAuthenticationMethods<T>[]
  sessionHandler?: (context: WobeCustomContext<T>) => void | Promise<void>
}

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

export enum AuthenticationProvider {
  GitHub = 'github',
  Google = 'google',
  EmailPassword = 'emailPassword',
  PhonePassword = 'phonePassword',
}

export enum SecondaryFactor {
  EmailOTP = 'emailOTP',
}
