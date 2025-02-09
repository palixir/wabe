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

    const { accessToken, idToken } =
      await googleOauth.validateAuthorizationCode(
        authorizationCode,
        codeVerifier,
      )

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
      select: { id: true },
    })

    const authenticationDataToSave: UserAuthenticationGoogle = {
      email,
      verifiedEmail,
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
