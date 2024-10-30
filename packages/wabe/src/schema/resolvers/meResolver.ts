import type { WabeContext } from '../../server/interface'
import type { DevWabeTypes } from '../../utils/helper'

export const meResolver = (
  _: any,
  __: any,
  context: WabeContext<DevWabeTypes>,
) => {
  return {
    user: context.user,
  }
}
