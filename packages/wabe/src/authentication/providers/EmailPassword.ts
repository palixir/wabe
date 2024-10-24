import argon2 from 'argon2'
import type {
  AuthenticationEventsOptions,
  AuthenticationEventsOptionsWithUserId,
  ProviderInterface,
} from '../interface'
import { hashPassword } from '../utils'

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
      context: {
        ...context,
        isRoot: true,
      },
      fields: ['authentication'],
      first: 1,
    })

    if (users.length === 0)
      throw new Error('Invalid authentication credentials')

    const user = users[0]

    const userDatabasePassword = user.authentication?.emailPassword?.password

    if (!userDatabasePassword)
      throw new Error('Invalid authentication credentials')

    // biome-ignore lint/correctness/noConstantCondition: <explanation>
    const isPasswordEquals = typeof Bun
      ? await Bun.password.verify(
          input.password,
          userDatabasePassword,
          'argon2id',
        )
      : await argon2.verify(userDatabasePassword, input.password)

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
    const users = await context.wabe.controllers.database.count({
      className: 'User',
      where: {
        id: {
          equalTo: userId,
        },
      },
      context,
    })

    if (users === 0) throw new Error('User not found')

    return {
      authenticationDataToSave: {
        email: input.email,
        password: await hashPassword(input.password),
      },
    }
  }
}
