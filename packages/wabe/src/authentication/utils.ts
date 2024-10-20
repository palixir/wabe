import argon2 from 'argon2'
import type { WabeTypes } from '../server'
import type { WabeContext } from '../server/interface'
import type {
  CustomAuthenticationMethods,
  ProviderInterface,
  SecondaryProviderInterface,
} from './interface'

export const getAuthenticationMethod = <
  T extends WabeTypes,
  U extends ProviderInterface | SecondaryProviderInterface,
>(
  listOfMethods: string[],
  context: WabeContext<any>,
): CustomAuthenticationMethods<T, U> => {
  const customAuthenticationConfig =
    context.wabe.config?.authentication?.customAuthenticationMethods

  if (!customAuthenticationConfig)
    throw new Error('No custom authentication methods found')

  // We remove the secondary factor to only get all authentication methods
  const authenticationMethods = listOfMethods.filter(
    (method) => method !== 'secondaryFactor',
  )

  // We check if the client don't use multiple authentication methods at the same time
  if (authenticationMethods.length > 1 || authenticationMethods.length === 0)
    throw new Error('One authentication method is required at the time')

  const authenticationMethod = authenticationMethods[0]

  // We check if the authentication method is valid
  const validAuthenticationMethod = customAuthenticationConfig.find(
    (method) =>
      method.name.toLowerCase() === authenticationMethod.toLowerCase(),
  )

  if (!validAuthenticationMethod)
    throw new Error('No available custom authentication methods found')

  return validAuthenticationMethod as CustomAuthenticationMethods<T, U>
}

export const hashPassword = async (password: string) =>
  // biome-ignore lint/correctness/noConstantCondition: Use to check the existence of global Bun
  typeof Bun
    ? await Bun.password.hash(password, 'argon2id')
    : await argon2.hash(password)
