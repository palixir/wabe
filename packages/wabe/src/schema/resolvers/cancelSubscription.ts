import type { MutationCancelSubscriptionArgs } from '../../../generated/wabe'
import type { WabeContext } from '../../server/interface'
import type { DevWabeTypes } from '../../utils/helper'

export const cancelSubscriptionResolver = async (
  _: any,
  { input }: MutationCancelSubscriptionArgs,
  context: WabeContext<DevWabeTypes>,
) => {
  if (!context.user && !context.isRoot) throw new Error('Permission denied')

  const paymentController = context.wabe.controllers.payment

  if (!paymentController) throw new Error('Payment adapter not defined')

  return paymentController.cancelSubscription(input)
}
