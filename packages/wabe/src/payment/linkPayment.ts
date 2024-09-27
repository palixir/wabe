import type { WabeContext } from '../server/interface'
import type { DevWabeTypes } from '../utils/helper'

export const linkPayment = async (
  context: WabeContext<DevWabeTypes>,
  email: string,
  amount: number,
  currency: string,
) => {
  const user = await context.wabe.controllers.database.getObjects({
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

  if (user.length === 0) return

  const userId = user[0].id

  await context.wabe.controllers.database.createObject({
    className: 'Payment',
    context: {
      ...context,
      isRoot: true,
    },
    data: {
      user: userId,
      amount,
      currency,
    },
    fields: [],
  })
}
