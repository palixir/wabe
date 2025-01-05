import type { SignUpWithInput } from '../../../generated/wabe'
import type { WabeContext } from '../../server/interface'
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
  const userSchema = context.wabe.config.schema?.classes?.find(
    (classItem) => classItem.name === 'User',
  )

  // TODO: improve this maybe need a refactor of ACL interface
  // Fix to allow anonymous user to create user but not when user creation is blocked for anonymous
  // Because here the createObject is done with root to avoid ACL issues
  if (userSchema?.permissions?.create?.requireAuthentication === true)
    return {
      accessToken: null,
      refreshToken: null,
      id: null,
    }

  // Create object call the provider signUp
  const res = await context.wabe.controllers.database.createObject({
    className: 'User',
    data: {
      authentication: input.authentication,
    },
    context: {
      ...context,
      isRoot: true,
    },
    fields: ['id'],
  })

  const session = new Session()

  if (!res) throw new Error('User not created')

  const { accessToken, refreshToken } = await session.create(res.id, {
    ...context,
    isRoot: true,
  })

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

  return { accessToken, refreshToken, id: res.id }
}
