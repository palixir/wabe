import type { MutationSendEmailArgs } from '../../../generated/wabe'
import type { WabeContext } from '../../server/interface'
import type { DevWabeTypes } from '../../utils/helper'

export const sendEmailResolver = async (
  _: any,
  { input }: MutationSendEmailArgs,
  context: WabeContext<DevWabeTypes>,
) => {
  if (!context.user && !context.isRoot) throw new Error('Permission denied')

  const emailController = context.wabe.controllers.email

  if (!emailController) throw new Error('Email adapter not defined')

  return emailController.send({
    ...input,
    text: input.text ?? undefined,
    html: input.html ?? undefined,
  })
}
