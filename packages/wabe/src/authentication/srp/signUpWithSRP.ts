import type { WabeContext } from '../../server/interface'
import type { DevWabeTypes } from '../../utils/helper'
import type { MutationSignUpWithSRPArgs } from '../../../generated/wabe'
import { contextWithRoot } from '../..'

export const signUpWithSRP = async (
  _: any,
  { input }: MutationSignUpWithSRPArgs,
  context: WabeContext<DevWabeTypes>,
) => {
  await context.wabe.controllers.database.createObject({
    className: 'User',
    context: contextWithRoot(context),
    data: {
      email: input.email,
      authentication: {
        emailPasswordSRP: {
          salt: input.salt,
          verifier: input.verifier,
          serverSecret: null,
        },
      },
    },
    select: {},
  })

  return true
}
