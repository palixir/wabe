import { createSRPServer } from 'js-srp6a'
import { randomBytes } from 'node:crypto'
import type { WabeContext } from '../../server/interface'
import type { DevWabeTypes } from '../../utils/helper'
import type { MutationProcessSRPChallengeArgs } from '../../../generated/wabe'
import { contextWithRoot } from '../..'

export const processSRPChallenge = async (
  _: any,
  { input }: MutationProcessSRPChallengeArgs,
  context: WabeContext<DevWabeTypes>,
) => {
  const server = createSRPServer('SHA-256', 3072)

  const users = await context.wabe.controllers.database.getObjects({
    className: 'User',
    context: contextWithRoot(context),
    where: {
      email: { equalTo: input.email },
    },
    select: {
      authentication: true,
    },
  })

  // Return bogus data to avoid leaking information
  if (users.length === 0)
    return {
      serverSessionProof: randomBytes(64).toString('hex'),
    }

  const user = users[0]

  const salt = user?.authentication?.emailPasswordSRP?.salt
  const verifier = user?.authentication?.emailPasswordSRP?.verifier
  const serverSecret = user?.authentication?.emailPasswordSRP?.serverSecret

  // Return bogus data to avoid leaking information
  if (!salt || !verifier || !serverSecret)
    return {
      serverSessionProof: randomBytes(64).toString('hex'),
    }

  const serverSession = await server.deriveSession(
    serverSecret,
    input.clientPublic,
    salt,
    '', // Because we don't hash the username
    verifier,
    input.clientSessionProof,
  )

  return { serverSessionProof: serverSession.proof }
}
