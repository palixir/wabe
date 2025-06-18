import { Algorithm, verify } from '@node-rs/argon2'
import type {
  AuthenticationEventsOptions,
  AuthenticationEventsOptionsWithUserId,
  ProviderInterface,
} from '../interface'
import { contextWithRoot } from '../../utils/export'
import type { DevWabeTypes } from '../../utils/helper'

const DUMMY_PASSWORD_HASH =
  '$argon2id$v=19$m=65536,t=2,p=1$YWJjZGVmZw$YzBhRkNiSEZlY3hzUVYxZg'

type PhonePasswordInterface = {
  password: string
  phone: string
  otp?: string
}

export class PhonePassword
  implements ProviderInterface<DevWabeTypes, PhonePasswordInterface>
{
  async onSignIn({
    input,
    context,
  }: AuthenticationEventsOptions<DevWabeTypes, PhonePasswordInterface>) {
    const users = await context.wabe.controllers.database.getObjects({
      className: 'User',
      where: {
        authentication: {
          phonePassword: {
            phone: { equalTo: input.phone },
          },
        },
      },
      context: contextWithRoot(context),
      select: { id: true, authentication: true },
      first: 1,
    })

    const user = users[0]
    const userDatabasePassword = user?.authentication?.phonePassword?.password

    const passwordHashToCheck = userDatabasePassword ?? DUMMY_PASSWORD_HASH

    const isPasswordEquals = await verify(passwordHashToCheck, input.password, {
      algorithm: Algorithm.Argon2id,
    })

    if (
      !user ||
      !isPasswordEquals ||
      input.phone !== user.authentication?.phonePassword?.phone
    )
      throw new Error('Invalid authentication credentials')

    return {
      user,
    }
  }

  async onSignUp({
    input,
    context,
  }: AuthenticationEventsOptions<DevWabeTypes, PhonePasswordInterface>) {
    const users = await context.wabe.controllers.database.count({
      className: 'User',
      where: {
        authentication: {
          phonePassword: {
            phone: { equalTo: input.phone },
          },
        },
      },
      context: contextWithRoot(context),
    })

    if (users > 0) throw new Error('Not authorized to create user')

    return {
      authenticationDataToSave: {
        phone: input.phone,
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
    PhonePasswordInterface
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
        phone: input.phone ?? user?.authentication?.phonePassword?.phone,
        password: input.password
          ? input.password
          : user?.authentication?.phonePassword?.password,
      },
    }
  }
}
