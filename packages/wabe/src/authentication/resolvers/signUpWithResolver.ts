import type { SignUpWithInput } from '../../../generated/wabe'
import type { WabeContext } from '../../server/interface'
import { contextWithRoot } from '../../utils/export'
import { Session } from '../Session'

// 0 - Get the authentication method
// 1 - We check if the signUp is possible (call onSign)
// 2 - We create the user
// 3 - We create session
export const signUpWithResolver = async (
  _: any,
  {
    input,
  }: {
    input: SignUpWithInput
  },
  context: WabeContext<any>,
) => {
  // Create object call the provider signUp
  const res = await context.wabe.controllers.database.createObject({
    className: 'User',
    data: {
      authentication: input.authentication,
    },
    context,
    select: { id: true },
  })

  const createdUserId = res?.id

  const session = new Session()

  if (!createdUserId) throw new Error('User not created')

  const { accessToken, refreshToken } = await session.create(
    createdUserId,
    contextWithRoot(context),
  )

  if (context.wabe.config.authentication?.session?.cookieSession) {
    context.response?.setCookie('refreshToken', refreshToken, {
      httpOnly: true,
      path: '/',
      sameSite: 'None',
      secure: true,
      expires: session.getRefreshTokenExpireAt(context.wabe.config),
    })

    context.response?.setCookie('accessToken', accessToken, {
      httpOnly: true,
      path: '/',
      sameSite: 'None',
      secure: true,
      expires: session.getAccessTokenExpireAt(context.wabe.config),
    })
  }

  return { accessToken, refreshToken, id: createdUserId }
}
