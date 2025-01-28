import type { UserAuthenticationGithub } from '../../../generated/wabe'
import { contextWithRoot } from '../../utils/export'
import {
  AuthenticationProvider,
  type AuthenticationEventsOptions,
  type ProviderInterface,
} from '../interface'
import { GitHub as GitHubOauth } from '../oauth/GitHub'

type GitHubInterface = {
  authorizationCode: string
  codeVerifier: string
}

export class GitHub implements ProviderInterface<GitHubInterface> {
  name = 'github'
  async _githubAuthentication({
    context,
    input,
  }: AuthenticationEventsOptions<GitHubInterface>) {
    const { authorizationCode, codeVerifier } = input

    const githubOauth = new GitHubOauth(context.wabe.config)

    const { accessToken } = await githubOauth.validateAuthorizationCode(
      authorizationCode,
      codeVerifier,
    )

    const { email, avatarUrl, username } =
      await githubOauth.getUserInfo(accessToken)

    const user = await context.wabe.controllers.database.getObjects({
      className: 'User',
      where: {
        authentication: {
          // @ts-expect-error
          github: {
            email: { equalTo: email },
          },
        },
      },
      context: contextWithRoot(context),
      first: 1,
      fields: ['id'],
    })

    const authenticationDataToSave: UserAuthenticationGithub = {
      email,
      username,
      avatarUrl,
    }

    if (user.length === 0) {
      const createdUser = await context.wabe.controllers.database.createObject({
        className: 'User',
        data: {
          provider: AuthenticationProvider.GitHub,
          isOauth: true,
          authentication: {
            github: authenticationDataToSave,
          },
        },
        context: contextWithRoot(context),
        fields: ['*', 'id'],
      })

      if (!createdUser) throw new Error('User not found')

      return {
        user: createdUser,
      }
    }

    if (!user[0]) throw new Error('User not found')

    return {
      user: user[0],
    }
  }

  onSignIn(options: AuthenticationEventsOptions<GitHubInterface>) {
    return this._githubAuthentication(options)
  }

  // @ts-expect-error
  onSignUp() {
    throw new Error(
      'SignUp is not implemented for Oauth provider, you should use signIn instead.',
    )
  }
}
