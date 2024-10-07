import type { WabeContext } from '../../server/interface'
import type { DevWabeTypes } from '../../utils/helper'
import { Session } from '../Session'

export const signOutResolver = async (
  _: any,
  __: any,
  context: WabeContext<DevWabeTypes>,
) => {
  const session = new Session()

  // For the moment we only delete the session because we suppose the token
  // are used with headers. We will need to delete the cookies in the future.
  await session.delete(context)

  return true
}
