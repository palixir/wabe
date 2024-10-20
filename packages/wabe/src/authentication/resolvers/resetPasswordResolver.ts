import type { ResetPasswordInput } from '../../../generated/wabe'
import type { WabeContext } from '../../server/interface'
import type { DevWabeTypes } from '../../utils/helper'
import type { ProviderInterface } from '../interface'
import { getAuthenticationMethod } from '../utils'

export const resetPasswordResolver = async (
  _: any,
  {
    input,
  }: {
    input: ResetPasswordInput
  },
  context: WabeContext<DevWabeTypes>,
) => {
  const { provider, name } = getAuthenticationMethod<
    DevWabeTypes,
    ProviderInterface
  >(Object.keys(input.authentication || {}), context)

  const inputOfTheGoodAuthenticationMethod =
    // @ts-expect-error
    input.authentication[name]

  if (!provider.onResetPassword)
    throw new Error(`Reset password is not supported for ${name} provider`)

  await provider.onResetPassword({
    input: inputOfTheGoodAuthenticationMethod,
    context,
  })

  return true
}
