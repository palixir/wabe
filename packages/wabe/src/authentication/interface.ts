import type { User } from '../../generated/wabe'
import type { WabeContext } from '../server/interface'
import type { SchemaFields } from '../schema'
import type { WabeTypes } from '../server'

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
  context: WabeContext<any>
}

export type AuthenticationEventsOptionsWithUserId<T> =
  AuthenticationEventsOptions<T> & {
    userId: string
  }

export type ProviderInterface<T = any> = {
  onSignIn: (options: AuthenticationEventsOptions<T>) => Promise<{
    user: Partial<User>
    oauth?: {
      refreshToken?: string
      accessToken: string
      accessTokenExpiresAt: Date
      refreshTokenExpiresAt: Date
    }
  }>
  onSignUp: (
    options: AuthenticationEventsOptions<T>,
  ) => Promise<{ authenticationDataToSave: any }>
  onUpdateAuthenticationData?: (
    options: AuthenticationEventsOptionsWithUserId<T>,
  ) => Promise<{ authenticationDataToSave: any }>
}

export type SecondaryProviderInterface<T = any> = {
  onSendChallenge: () => Promise<void>
  onVerifyChallenge: (options: T) => Promise<boolean>
}

export type CustomAuthenticationMethods<
  T extends WabeTypes,
  U = ProviderInterface | SecondaryProviderInterface,
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

export enum AuthenticationProvider {
  Google = 'google',
  EmailPassword = 'emailPassword',
}
