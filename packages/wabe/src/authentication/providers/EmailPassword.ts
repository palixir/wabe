import argon2 from 'argon2'
import { createHash } from 'node:crypto'
import { totp } from 'otplib'
import type {
  AuthenticationEventsOptions,
  AuthenticationEventsOptionsWithUserId,
  ProviderInterface,
} from '../interface'
import { defaultResetPasswordTemplate } from './defaultResetPasswordTemplate'

type EmailPasswordInterface = {
  password: string
  email: string
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
        // biome-ignore lint/correctness/noConstantCondition: <explanation>
        password: typeof Bun
          ? await Bun.password.hash(input.password, 'argon2id')
          : await argon2.hash(input.password),
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
        // biome-ignore lint/correctness/noConstantCondition: <explanation>
        password: typeof Bun
          ? await Bun.password.hash(input.password, 'argon2id')
          : await argon2.hash(input.password),
      },
    }
  }

  async onResetPassword({
    input,
    context,
  }: AuthenticationEventsOptions<EmailPasswordInterface>) {
    const emailController = context.wabe.controllers.email

    if (!emailController) throw new Error('Email adapter not found')

    const email = input.email

    const user = await context.wabe.controllers.database.getObjects({
      className: 'User',
      where: {
        authentication: {
          equalTo: {
            emailPassword: {
              email,
            },
          },
        },
      },
      fields: ['id'],
      first: 1,
      context,
    })

    if (user.length === 0) throw new Error('User not found')

    const userId = user[0].id

    const secret = context.wabe.config.internalConfig.otpSecret

    const hashedSecret = createHash('sha256')
      .update(`${secret}:${userId}`)
      .digest('hex')

    const otp = totp.generate(hashedSecret)

    await emailController.send({
      from: 'noreply@wabe.com',
      to: [''],
      subject: 'Reset your password',
      html: defaultResetPasswordTemplate(otp),
    })
  }
}
