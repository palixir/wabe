import type { ProviderInterface } from '../authentication'
import { getAuthenticationMethod } from '../authentication/utils'
import type { HookObject } from './HookObject'

export const callAuthenticationProvider = async (
  hookObject: HookObject<any, any>,
) => {
  if (
    !hookObject.isFieldUpdate('authentication') ||
    hookObject.getNewData().isOauth
  )
    return

  const context = hookObject.context

  const authentication = hookObject.getNewData().authentication

  const { provider, name } = getAuthenticationMethod<any, ProviderInterface>(
    Object.keys(authentication),
    context,
  )

  const inputOfTheGoodAuthenticationMethod = authentication[name]

  const { authenticationDataToSave } = await provider.onSignUp({
    input: inputOfTheGoodAuthenticationMethod,
    context: {
      ...hookObject.context,
      isRoot: true,
    },
  })

  hookObject.upsertNewData('authentication', {
    [name]: {
      ...authenticationDataToSave,
    },
  })
}

export const defaultCallAuthenticationProviderOnBeforeCreateUser = (
  hookObject: HookObject<any, any>,
) => callAuthenticationProvider(hookObject)
