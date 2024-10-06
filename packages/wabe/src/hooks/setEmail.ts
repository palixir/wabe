import type { DevWabeTypes } from '../utils/helper'
import type { HookObject } from './HookObject'

const updateEmail = async (object: HookObject<DevWabeTypes, 'User'>) => {
  // @ts-expect-error
  const authentication = object.getNewData().authentication

  if (!authentication) return

  // Considering that we only have one authentication provider (for double auth maybe need an ajustment
  const provider = Object.keys(authentication)[0]

  const emailToSave = authentication[provider].email

  object.upsertNewData('email', emailToSave)

  if (provider) object.upsertNewData('provider', provider)
}

// This hook works for official authentication provider that store email in "email" field
// Maybe need custom hook for custom authentication provider
export const defaultSetEmail = (object: HookObject<DevWabeTypes, 'User'>) => {
  if (object.isFieldUpdate('email')) return

  updateEmail(object)
}

export const defaultSetEmailOnUpdate = (
  object: HookObject<DevWabeTypes, 'User'>,
) => {
  if (object.isFieldUpdate('email')) return

  updateEmail(object)
}
