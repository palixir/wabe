import type { HookObject } from './HookObject'

export const defaultBeforeCreateUser = (object: HookObject<any, any>) => {
  const context = object.context

  if (context.isRoot) return

  if (context.wabe.config.authentication?.disableSignUp && !context.user)
    throw new Error('Sign up is disabled')
}
