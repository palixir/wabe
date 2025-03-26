import type {
  AuthenticationEventsOptions,
  OnVerifyChallengeOptions,
  ProviderInterface,
  SecondaryProviderInterface,
} from '../interface'
import { contextWithRoot } from '../../utils/export'
import type { DevWabeTypes } from '../../utils/helper'
import { createSRPServer } from 'js-srp6a'

type EmailPasswordSRPInterface = {
  clientPublic: string
  email: string
  salt?: string
  verifier?: string
}

export class EmailPasswordSRP
  implements ProviderInterface<DevWabeTypes, EmailPasswordSRPInterface>
{
  async onSignIn({
    input,
    context,
  }: AuthenticationEventsOptions<DevWabeTypes, EmailPasswordSRPInterface>) {
    const server = createSRPServer('SHA-256', 3072)

    const users = await context.wabe.controllers.database.getObjects({
      className: 'User',
      context: contextWithRoot(context),
      where: {
        email: { equalTo: input.email },
      },
      select: {
        id: true,
        authentication: true,
        secondFA: true,
        email: true,
      },
      first: 1,
    })

    if (users.length === 0)
      throw new Error('Invalid authentication credentials')

    const user = users[0]

    if (!user) throw new Error('Invalid authentication credentials')

    const salt = user?.authentication?.emailPasswordSRP?.salt
    const verifier = user?.authentication?.emailPasswordSRP?.verifier

    // Return bogus data to avoid leaking information
    if (!salt || !verifier)
      throw new Error('Invalid authentication credentials')

    const ephemeral = await server.generateEphemeral(verifier)

    await context.wabe.controllers.database.updateObject({
      className: 'User',
      context: contextWithRoot(context),
      id: user.id,
      data: {
        authentication: {
          emailPasswordSRP: {
            ...user.authentication?.emailPasswordSRP,
            serverSecret: ephemeral.secret,
          },
        },
      },
      select: {},
    })

    return { srp: { salt, serverPublic: ephemeral.public }, user }
  }

  async onSignUp({
    input,
    context,
  }: AuthenticationEventsOptions<DevWabeTypes, EmailPasswordSRPInterface>) {
    const users = await context.wabe.controllers.database.count({
      className: 'User',
      where: {
        email: { equalTo: input.email },
      },
      context: contextWithRoot(context),
    })

    // Hide real message
    if (users > 0) throw new Error('Not authorized to create user')

    return {
      authenticationDataToSave: {
        salt: input.salt,
        verifier: input.verifier,
        email: input.email,
        serverSecret: null,
      },
    }
  }
}

export interface EmailPasswordSRPChallengeInterface {
  email: string
  clientPublic: string
  clientSessionProof: string
}

export class EmailPasswordSRPChallenge
  implements
    SecondaryProviderInterface<DevWabeTypes, EmailPasswordSRPChallengeInterface>
{
  async onVerifyChallenge({
    context,
    input,
  }: OnVerifyChallengeOptions<
    DevWabeTypes,
    EmailPasswordSRPChallengeInterface
  >) {
    const server = createSRPServer('SHA-256', 3072)

    const users = await context.wabe.controllers.database.getObjects({
      className: 'User',
      context: contextWithRoot(context),
      where: {
        authentication: {
          emailPasswordSRP: {
            email: { equalTo: input.email },
          },
        },
      },
      select: {
        authentication: true,
      },
    })

    // Return bogus data to avoid leaking information
    if (users.length === 0)
      throw new Error('Invalid authentication credentials')

    const user = users[0]

    if (!user) throw new Error('Invalid authentication credentials')

    const salt = user?.authentication?.emailPasswordSRP?.salt
    const verifier = user?.authentication?.emailPasswordSRP?.verifier
    const serverSecret = user?.authentication?.emailPasswordSRP?.serverSecret

    // Return bogus data to avoid leaking information
    if (!salt || !verifier || !serverSecret)
      throw new Error('Invalid authentication credentials')

    const serverSession = await server.deriveSession(
      serverSecret,
      input.clientPublic,
      salt,
      '', // Because we don't hash the username
      verifier,
      input.clientSessionProof,
    )

    return { userId: user.id, srp: { serverSessionProof: serverSession.proof } }
  }
}
