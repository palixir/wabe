import { Algorithm, verify } from '@node-rs/argon2'
import type {
  AuthenticationEventsOptions,
  AuthenticationEventsOptionsWithUserId,
  ProviderInterface,
} from '../interface'
import { hashPassword } from '../utils'
import { contextWithRoot } from '../../utils/export'
import type { DevWabeTypes } from '../../utils/helper'

type EmailPasswordInterface = {
  password: string
  email: string
  otp?: string
}

export class EmailPassword
  implements ProviderInterface<DevWabeTypes, EmailPasswordInterface>
{
  async onSignIn({
    input,
    context,
  }: AuthenticationEventsOptions<DevWabeTypes, EmailPasswordInterface>) {
    const users = await context.wabe.controllers.database.getObjects({
      className: 'User',
      where: {
        authentication: {
          emailPassword: {
            email: { equalTo: input.email },
          },
        },
      },
      context: contextWithRoot(context),
      select: { id: true, authentication: true, secondFA: true, email: true },
      first: 1,
    })

    const { showSensitiveErrors } = context.wabe.config.security || {}

    if (users.length === 0)
      throw new Error(
        showSensitiveErrors
          ? 'Username not found in database'
          : 'Invalid authentication credentials',
      )

    const user = users[0]

    const userDatabasePassword = user?.authentication?.emailPassword?.password

    if (!userDatabasePassword)
      throw new Error(
        showSensitiveErrors
          ? 'User has no password set up'
          : 'Invalid authentication credentials',
      )

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
      throw new Error(
        showSensitiveErrors
          ? 'Password or email are not matching'
          : 'Invalid authentication credentials',
      )

    return {
      user,
    }
  }

  async onSignUp({
    input,
    context,
  }: AuthenticationEventsOptions<DevWabeTypes, EmailPasswordInterface>) {
    const users = await context.wabe.controllers.database.count({
      className: 'User',
      where: {
        authentication: {
          emailPassword: {
            email: { equalTo: input.email },
          },
        },
      },
      context: contextWithRoot(context),
    })

    const { showSensitiveErrors } = context.wabe.config.security || {}

    if (users > 0)
      throw new Error(
        showSensitiveErrors
          ? 'User already exists in database'
          : 'Not authorized to create user',
      )

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
  }: AuthenticationEventsOptionsWithUserId<
    DevWabeTypes,
    EmailPasswordInterface
  >) {
    const users = await context.wabe.controllers.database.getObjects({
      className: 'User',
      where: {
        id: {
          equalTo: userId,
        },
      },
      context,
      select: { authentication: true },
    })

    const { showSensitiveErrors } = context.wabe.config.security || {}

    if (users.length === 0)
      throw new Error(
        showSensitiveErrors
          ? 'User not found'
          : 'Not authorized to update user credentials',
      )

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
