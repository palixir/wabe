import type { DevWabeTypes } from '../../utils/helper'
import {
  AuthenticationProvider,
  type AuthenticationEventsOptions,
  type ProviderInterface,
} from '../interface'
import { oAuthAuthentication } from './OAuth'

type GitHubInterface = {
  authorizationCode: string
  codeVerifier: string
}

export class GitHub
  implements ProviderInterface<DevWabeTypes, GitHubInterface>
{
  name = 'github'
  onSignIn(
    options: AuthenticationEventsOptions<DevWabeTypes, GitHubInterface>,
  ) {
    return oAuthAuthentication(AuthenticationProvider.GitHub)(options)
  }

  // @ts-expect-error
  onSignUp() {
    throw new Error(
      'SignUp is not implemented for Oauth provider, you should use signIn instead.',
    )
  }
}
