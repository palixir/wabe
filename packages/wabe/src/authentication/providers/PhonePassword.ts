import { Algorithm, verify } from '@node-rs/argon2'
import type {
  AuthenticationEventsOptions,
  AuthenticationEventsOptionsWithUserId,
  ProviderInterface,
} from '../interface'
import { hashPassword } from '../utils'
import { contextWithRoot } from '../../utils/export'

type PhonePasswordInterface = {
  password: string
  phone: string
  otp?: string
}

export class PhonePassword
  implements ProviderInterface<PhonePasswordInterface>
{
  async onSignIn({
    input,
    context,
  }: AuthenticationEventsOptions<PhonePasswordInterface>) {
    const users = await context.wabe.controllers.database.getObjects({
      className: 'User',
      where: {
        authentication: {
          // @ts-expect-error
          phonePassword: {
            phone: { equalTo: input.phone },
          },
        },
      },
      context: contextWithRoot(context),
      select: { id: true, authentication: true },
      first: 1,
    })

    if (users.length === 0)
      throw new Error('Invalid authentication credentials')

    const user = users[0]

    const userDatabasePassword = user?.authentication?.phonePassword?.password

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
  }: AuthenticationEventsOptions<PhonePasswordInterface>) {
    const users = await context.wabe.controllers.database.count({
      className: 'User',
      where: {
        authentication: {
          // @ts-expect-error
          phonePassword: {
            phone: { equalTo: input.phone },
          },
        },
      },
      context,
    })

    if (users > 0) throw new Error('User already exists')

    return {
      authenticationDataToSave: {
        phone: input.phone,
        password: await hashPassword(input.password),
      },
    }
  }

  async onUpdateAuthenticationData({
    userId,
    input,
    context,
  }: AuthenticationEventsOptionsWithUserId<PhonePasswordInterface>) {
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
          ? await hashPassword(input.password)
          : user?.authentication?.phonePassword?.password,
      },
    }
  }
}
