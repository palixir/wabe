import type { SignInWithInput } from '../../../generated/wabe'
import type { WabeContext } from '../../server/interface'
import { getCookieInRequestHeaders } from '../../utils'
import type { DevWabeTypes } from '../../utils/helper'
import { Session } from '../Session'
import type {
  ProviderInterface,
  SecondaryProviderInterface,
} from '../interface'
import { getAuthenticationMethod } from '../utils'

// 0 - Get the authentication method
// 1 - We check if the signIn is possible (call onSign)
// 2 - If secondaryFactor is present, we call the onSendChallenge method of the provider
// 3 - We create session
export const signInWithResolver = async (
  _: any,
  {
    input,
  }: {
    input: SignInWithInput
  },
  context: WabeContext<DevWabeTypes>,
) => {
  const { provider, name } = getAuthenticationMethod<
    DevWabeTypes,
    ProviderInterface
  >(Object.keys(input.authentication || {}), context)

  const inputOfTheGoodAuthenticationMethod =
    // @ts-expect-error
    input.authentication[name]

  // 1 - We call the onSignIn method of the provider
  const { user } = await provider.onSignIn({
    input: inputOfTheGoodAuthenticationMethod,
    context,
  })

  const userId = user.id

  if (!userId) throw new Error('Authentication failed')

  // 2 - We call the onSendChallenge method of the provider
  if (input.authentication?.secondaryFactor) {
    const secondaryProvider = getAuthenticationMethod<
      DevWabeTypes,
      SecondaryProviderInterface
    >([input.authentication.secondaryFactor], context)

    await secondaryProvider.provider.onSendChallenge()

    return { accessToken: null, refreshToken: null, id: userId }
  }

  const session = new Session()

  const { refreshToken, accessToken } = await session.create(userId, context)

  if (context.wabe.config.authentication?.session?.cookieSession) {
    const accessTokenExpiresAt = session.getAccessTokenExpireAt(
      context.wabe.config,
    )
    const refreshTokenExpiresAt = session.getRefreshTokenExpireAt(
      context.wabe.config,
    )

    context.response?.setCookie('refreshToken', refreshToken, {
      httpOnly: true,
      path: '/',
      sameSite: 'None',
      secure: true,
      // expires: refreshTokenExpiresAt,
      expires: new Date(Date.now() + 1000 * 60 * 60 * 24),
    })

    context.response?.setCookie('accessToken', accessToken, {
      httpOnly: true,
      path: '/',
      sameSite: 'None',
      secure: true,
      expires: new Date(Date.now() + 1000 * 60 * 60 * 24),
    })
  }

  return { accessToken, refreshToken, id: userId }
}
