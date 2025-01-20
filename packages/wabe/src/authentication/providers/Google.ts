import type { UserAuthenticationGoogle } from '../../../generated/wabe'
import { contextWithRoot } from '../../utils/export'
import {
  AuthenticationProvider,
  type AuthenticationEventsOptions,
  type ProviderInterface,
} from '../interface'
import { Google as GoogleOauth } from '../oauth/Google'

type GoogleInterface = {
  authorizationCode: string
  codeVerifier: string
}

export class Google implements ProviderInterface<GoogleInterface> {
  name = 'google'
  async _googleAuthentication({
    context,
    input,
  }: AuthenticationEventsOptions<GoogleInterface>) {
    const { authorizationCode, codeVerifier } = input

    const googleOauth = new GoogleOauth(context.wabe.config)

    const {
      accessToken,
      refreshToken,
      idToken,
      accessTokenExpiresAt,
      refreshTokenExpiresAt,
    } = await googleOauth.validateAuthorizationCode(
      authorizationCode,
      codeVerifier,
    )

    if (!refreshToken) throw new Error('Access_type must be offline')

    if (!idToken) throw new Error('Authentication failed')

    const { email, verifiedEmail } = await googleOauth.getUserInfo(
      accessToken,
      idToken,
    )

    const user = await context.wabe.controllers.database.getObjects({
      className: 'User',
      where: {
        authentication: {
          // @ts-expect-error
          google: {
            email: { equalTo: email },
          },
        },
      },
      context: contextWithRoot(context),
      first: 1,
      fields: ['id'],
    })

    const authenticationDataToSave: UserAuthenticationGoogle = {
      email,
      verifiedEmail,
      idToken,
    }

    if (user.length === 0) {
      const createdUser = await context.wabe.controllers.database.createObject({
        className: 'User',
        data: {
          provider: AuthenticationProvider.Google,
          isOauth: true,
          authentication: {
            google: authenticationDataToSave,
          },
        },
        context: contextWithRoot(context),
        fields: ['*', 'id'],
      })

      if (!createdUser) throw new Error('User not found')

      return {
        user: createdUser,
        oauth: {
          refreshToken,
          accessToken,
          accessTokenExpiresAt: accessTokenExpiresAt || new Date(),
          refreshTokenExpiresAt: refreshTokenExpiresAt || new Date(),
        },
      }
    }

    if (!user[0]) throw new Error('User not found')

    return {
      user: user[0],
      oauth: {
        refreshToken,
        accessToken,
        accessTokenExpiresAt: accessTokenExpiresAt || new Date(),
        refreshTokenExpiresAt: refreshTokenExpiresAt || new Date(),
      },
    }
  }

  onSignIn(options: AuthenticationEventsOptions<GoogleInterface>) {
    return this._googleAuthentication(options)
  }

  // @ts-expect-error
  onSignUp() {
    throw new Error(
      'SignUp is not implemented for Oauth provider, you should use signIn instead.',
    )
  }
}
