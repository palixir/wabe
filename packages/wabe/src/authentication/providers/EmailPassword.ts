import { Algorithm, verify } from '@node-rs/argon2'
import type {
  AuthenticationEventsOptions,
  AuthenticationEventsOptionsWithUserId,
  ProviderInterface,
} from '../interface'
import { hashPassword } from '../utils'
import { contextWithRoot } from '../../utils/export'

type EmailPasswordInterface = {
  password: string
  email: string
  otp?: string
}

export class EmailPassword
  implements ProviderInterface<EmailPasswordInterface>
{
  async onSignIn({
    input,
    context,
  }: AuthenticationEventsOptions<EmailPasswordInterface>) {
    const users = await context.wabe.controllers.database.getObjects({
      className: 'User',
      where: {
        authentication: {
          // @ts-expect-error
          emailPassword: {
            email: { equalTo: input.email },
          },
        },
      },
      context: contextWithRoot(context),
      fields: ['id', 'authentication'],
      first: 1,
    })

    if (users.length === 0)
      throw new Error('Invalid authentication credentials')

    const user = users[0]

    const userDatabasePassword = user?.authentication?.emailPassword?.password

    if (!userDatabasePassword)
      throw new Error('Invalid authentication credentials')

    const isPasswordEquals = await verify(
      userDatabasePassword,
      input.password,
      {
        algorithm: Algorithm.Argon2id,
      },
    )

    if (
      !isPasswordEquals ||
      input.email !== user.authentication?.emailPassword?.email
    )
      throw new Error('Invalid authentication credentials')

    return {
      user,
    }
  }

  async onSignUp({
    input,
    context,
  }: AuthenticationEventsOptions<EmailPasswordInterface>) {
    const users = await context.wabe.controllers.database.count({
      className: 'User',
      where: {
        authentication: {
          // @ts-expect-error
          emailPassword: {
            email: { equalTo: input.email },
          },
        },
      },
      context,
    })

    if (users > 0) throw new Error('User already exists')

    return {
      authenticationDataToSave: {
        email: input.email,
        password: await hashPassword(input.password),
      },
    }
  }

  async onUpdateAuthenticationData({
    userId,
    input,
    context,
  }: AuthenticationEventsOptionsWithUserId<EmailPasswordInterface>) {
    const users = await context.wabe.controllers.database.getObjects({
      className: 'User',
      where: {
        id: {
          equalTo: userId,
        },
      },
      context,
      fields: ['authentication'],
    })

    if (users.length === 0) throw new Error('User not found')

    const user = users[0]

    return {
      authenticationDataToSave: {
        email: input.email ?? user?.authentication?.emailPassword?.email,
        password: input.password
          ? await hashPassword(input.password)
          : user?.authentication?.emailPassword?.password,
      },
    }
  }
}
