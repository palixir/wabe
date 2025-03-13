import { createSRPServer } from 'js-srp6a'
import { randomBytes } from 'node:crypto'
import type { WabeContext } from '../../server/interface'
import type { DevWabeTypes } from '../../utils/helper'
import type { MutationSignInWithSRPArgs } from '../../../generated/wabe'
import { contextWithRoot } from '../..'

export const signInWithSRP = async (
  _: any,
  { input }: MutationSignInWithSRPArgs,
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
      id: true,
      authentication: true,
    },
  })

  // Return bogus data to avoid leaking information
  if (users.length === 0)
    return {
      salt: randomBytes(32).toString('hex'),
      serverPublic: randomBytes(768).toString('hex'),
    }

  const user = users[0]

  const salt = user?.authentication?.emailPasswordSRP?.salt
  const verifier = user?.authentication?.emailPasswordSRP?.verifier

  // Return bogus data to avoid leaking information
  if (!salt || !verifier)
    return {
      salt: randomBytes(32).toString('hex'),
      serverPublic: randomBytes(768).toString('hex'),
    }

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

  return { salt, serverPublic: ephemeral.public }
}
