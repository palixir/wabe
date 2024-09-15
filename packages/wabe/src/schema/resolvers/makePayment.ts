import type { MutationMakePaymentArgs } from '../../../generated/wabe'
import type { Product } from '../../payment'
import type { WabeContext } from '../../server/interface'
import type { DevWabeTypes } from '../../utils/helper'

export const makePaymentResolver = async (
  _: any,
  { input }: MutationMakePaymentArgs,
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

  const url = await paymentController.createPayment({
    cancelUrl,
    successUrl,
    customerEmail: email,
    paymentMode,
    automaticTax: automaticTax ?? false,
    recurringInterval: recurringInterval ?? 'month',
    products: products as Product[],
  })

  const userWithEmail = await context.wabe.controllers.database.getObjects({
    className: 'User',
    context: {
      ...context,
      isRoot: true,
    },
    fields: ['id'],
    where: {
      email: {
        equalTo: email,
      },
    },
    first: 1,
  })

  if (userWithEmail.length === 0) throw new Error('User not found')

  const userId = userWithEmail[0].id

  const amount = products.reduce(
    (acc, product) =>
      acc + (product?.unitAmount || 0) * (product?.quantity || 0),
    0,
  )

  await context.wabe.controllers.database.createObject({
    className: 'Payment',
    context: {
      ...context,
      isRoot: true,
    },
    data: {
      user: userId,
      amount,
    },
    fields: [],
  })

  return url
}
