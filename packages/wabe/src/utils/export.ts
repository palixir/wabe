import type { WabeContext } from '../server/interface'

export const contextWithRoot = (
  context: WabeContext<any>,
): WabeContext<any> => ({
  ...context,
  isRoot: true,
})
