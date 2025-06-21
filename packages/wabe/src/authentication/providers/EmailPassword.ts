import { Algorithm, verify } from '@node-rs/argon2'
import type {
  AuthenticationEventsOptions,
  AuthenticationEventsOptionsWithUserId,
  ProviderInterface,
} from '../interface'
import { contextWithRoot } from '../../utils/export'
import type { DevWabeTypes } from '../../utils/helper'

type EmailPasswordInterface = {
  password: string
  email: string
  otp?: string
}

const DUMMY_PASSWORD_HASH =
  '$argon2id$v=19$m=65536,t=2,p=1$YWJjZGVmZw$YzBhRkNiSEZlY3hzUVYxZg'

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
      first: 1,
    })

    const user = users[0]
    const userDatabasePassword = user?.authentication?.emailPassword?.password

    const passwordHashToCheck = userDatabasePassword ?? DUMMY_PASSWORD_HASH

    const isPasswordEquals = await verify(passwordHashToCheck, input.password, {
      algorithm: Algorithm.Argon2id,
    })

    if (
      !user ||
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

    // Hide real message
    if (users > 0) throw new Error('Not authorized to create user')

    return {
      authenticationDataToSave: {
        email: input.email,
        password: input.password,
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

    if (users.length === 0) throw new Error('User not found')

    const user = users[0]

    return {
      authenticationDataToSave: {
        email: input.email ?? user?.authentication?.emailPassword?.email,
        password: input.password
          ? input.password
          : user?.authentication?.emailPassword?.password,
      },
    }
  }
}
