import type { UpdateAuthenticationDataInput } from '../../../generated/wabe'
import type { WabeContext } from '../../server/interface'
import type { DevWabeTypes } from '../../utils/helper'
import type { ProviderInterface } from '../interface'
import { getAuthenticationMethod } from '../utils'

export const updateAuthenticationDataResolver = async (
  _: any,
  {
    input,
  }: {
    input: UpdateAuthenticationDataInput
  },
  context: WabeContext<DevWabeTypes>,
) => {
  if (input.userId !== context.user?.id && !context.isRoot)
    throw new Error('Permission denied')

  const { provider, name } = getAuthenticationMethod<
    DevWabeTypes,
    ProviderInterface
  >(Object.keys(input.authentication || {}), context)

  // @ts-expect-error
  const inputOfTheGoodAuthenticationMethod = input.authentication[name]

  if (!provider.onUpdateAuthenticationData)
    throw new Error(`onUpdateAuthenticationData method not found for ${name}`)

  const { authenticationDataToSave } =
    await provider.onUpdateAuthenticationData({
      input: inputOfTheGoodAuthenticationMethod,
      userId: input.userId,
      context,
    })

  await context.wabe.controllers.database.updateObject({
    className: 'User',
    context: {
      ...context,
      isRoot: true,
    },
    id: input.userId,
    data: {
      authentication: {
        [name]: {
          ...authenticationDataToSave,
        },
      },
    },
    fields: [],
  })

  return true
}
