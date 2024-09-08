import type { MutationCreatePaymentArgs } from '../../../generated/wabe'
import type { WabeContext } from '../../server/interface'
import type { DevWabeTypes } from '../../utils/helper'

export const createPaymentResolver = async (
  _: any,
  { input }: MutationCreatePaymentArgs,
  context: WabeContext<DevWabeTypes>,
) => {
  if (!context.user && !context.isRoot) throw new Error('Permission denied')

  const paymentController = context.wabe.controllers.payment

  if (!paymentController) throw new Error('Payment adapter not defined')

  const {
    cancelUrl,
    successUrl,
    customerEmail,
    paymentMode,
    automaticTax,
    recurringInterval,
  } = input

  return paymentController.createPayment({
    cancelUrl,
    successUrl,
    customerEmail,
    paymentMode,
    automaticTax: automaticTax ?? false,
    recurringInterval: recurringInterval ?? 'month',
  })
}
