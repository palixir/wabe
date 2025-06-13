import type {
  AuthenticationEventsOptions,
  OnVerifyChallengeOptions,
  ProviderInterface,
  SecondaryProviderInterface,
} from '../interface'
import { contextWithRoot } from '../../utils/export'
import type { DevWabeTypes } from '../../utils/helper'
import { createSRPServer, type Ephemeral, type Session } from 'js-srp6a'

// 🛡 Valeurs factices pour mitigation des timing attacks
const DUMMY_SALT = 'deadbeefdeadbeefdeadbeefdeadbeef'
const DUMMY_VERIFIER =
  '94c8f9b69f44fa0453a8a65129a7865ea2d70b21e645cf185d6fd42a679e524c394d4f02bba2032b10517be8c80f0f58e94302cb57cce7ce1e0a21906b6d22020b84a473d8ef58ea1f53e5204f8b83f05dc334b781fda309ad7cb8fa5c91dc81f64c114b671688b22e0f693a9c97ad2f43e6f1954c83d73e81e3dc8a963b7cbce'

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

    const user = users[0]

    const salt = user?.authentication?.emailPasswordSRP?.salt ?? DUMMY_SALT
    const verifier =
      user?.authentication?.emailPasswordSRP?.verifier ?? DUMMY_VERIFIER

    let ephemeral: Ephemeral
    try {
      ephemeral = await server.generateEphemeral(verifier)
    } catch {
      throw new Error('Invalid authentication credentials')
    }

    if (!user || !user?.id) {
      // Simulation d'opération pour garder le même temps
      await new Promise((resolve) => setTimeout(resolve, 10))
      throw new Error('Invalid authentication credentials')
    }

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
        id: true,
        authentication: true,
      },
    })

    const user = users[0]

    const salt = user?.authentication?.emailPasswordSRP?.salt ?? DUMMY_SALT
    const verifier =
      user?.authentication?.emailPasswordSRP?.verifier ?? DUMMY_VERIFIER
    const serverSecret =
      user?.authentication?.emailPasswordSRP?.serverSecret ?? 'deadbeef'

    let serverSession: Session
    try {
      serverSession = await server.deriveSession(
        serverSecret,
        input.clientPublic,
        salt,
        '', // no username
        verifier,
        input.clientSessionProof,
      )
    } catch {
      throw new Error('Invalid authentication credentials')
    }

    if (!user || !user?.id) {
      // Simulation pour garder un timing constant
      await new Promise((resolve) => setTimeout(resolve, 10))
      throw new Error('Invalid authentication credentials')
    }

    return {
      userId: user.id,
      srp: {
        serverSessionProof: serverSession.proof,
      },
    }
  }
}
