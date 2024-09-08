import type { MutationCreatePaymentArgs } from '../../../generated/wabe'
import type { Product } from '../../payment'
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
    products,
  } = input

  const email = customerEmail || context.user?.email

  if (!email) throw new Error('Customer email is required')

  return paymentController.createPayment({
    cancelUrl,
    successUrl,
    customerEmail: email,
    paymentMode,
    automaticTax: automaticTax ?? false,
    recurringInterval: recurringInterval ?? 'month',
    products: products as Product[],
  })
}
