import type { MutationSendEmailArgs } from '../../../generated/wabe'
import type { WabeContext } from '../../server/interface'
import type { DevWabeTypes } from '../../utils/helper'

export const sendEmailResolver = async (
  _: any,
  args: MutationSendEmailArgs,
  context: WabeContext<DevWabeTypes>,
) => {
  return context.wabe.controllers.email?.send(args.input)
}
