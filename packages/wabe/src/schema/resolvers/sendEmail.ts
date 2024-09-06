import type { MutationSendEmailArgs } from '../../../generated/wabe'
import type { WabeContext } from '../../server/interface'
import type { DevWabeTypes } from '../../utils/helper'

export const sendEmailResolver = async (
  _: any,
  { input }: MutationSendEmailArgs,
  context: WabeContext<DevWabeTypes>,
) => {
  if (!context.user && !context.isRoot) throw new Error('Permission denied')

  return context.wabe.controllers.email?.send({
    ...input,
    text: input.text ?? undefined,
    html: input.html ?? undefined,
  })
}
