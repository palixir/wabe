import type { WabeContext } from '../../server/interface'
import { contextWithRoot } from '../../utils/export'
import type { DevWabeTypes } from '../../utils/helper'
import {
  type AuthenticationEventsOptions,
  AuthenticationProvider,
} from '../interface'
import { Google } from '../oauth'
import { GitHub } from '../oauth/GitHub'

export type OAuthAuthenticationInterface = {
  authorizationCode: string
  codeVerifier: string
}

export const getProvider = (
  context: WabeContext<DevWabeTypes>,
  provider: AuthenticationProvider,
) => {
  const config = context.wabe.config

  switch (provider) {
    case AuthenticationProvider.Google:
      return new Google(config)
    case AuthenticationProvider.GitHub:
      return new GitHub(config)
    default:
      throw new Error(`Provider ${provider} not found`)
  }
}

export const oAuthAuthentication =
  (oAuthProvider: AuthenticationProvider) =>
  async ({
    context,
    input,
  }: AuthenticationEventsOptions<
    DevWabeTypes,
    OAuthAuthenticationInterface
  >) => {
    const { authorizationCode, codeVerifier } = input

    const provider = getProvider(context, oAuthProvider)

    const { accessToken } = await provider.validateAuthorizationCode(
      authorizationCode,
      codeVerifier,
    )

    const userInfoToSave = await provider.getUserInfo(accessToken)

    const user = await context.wabe.controllers.database.getObjects({
      className: 'User',
      where: {
        authentication: {
          [oAuthProvider]: {
            email: { equalTo: userInfoToSave.email },
          },
        },
      },
      context: contextWithRoot(context),
      first: 1,
      select: {
        authentication: true,
        role: true,
        secondFA: true,
        email: true,
        id: true,
        provider: true,
        isOauth: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    if (user.length === 0) {
      const createdUser = await context.wabe.controllers.database.createObject({
        className: 'User',
        data: {
          provider: oAuthProvider,
          isOauth: true,
          authentication: {
            [oAuthProvider]: userInfoToSave,
          },
        },
        context: contextWithRoot(context),
        select: {
          authentication: true,
          role: true,
          secondFA: true,
          email: true,
          id: true,
          provider: true,
          isOauth: true,
          createdAt: true,
          updatedAt: true,
        },
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
