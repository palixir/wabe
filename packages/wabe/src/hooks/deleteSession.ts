import type { DevWabeTypes } from '../utils/helper'
import type { HookObject } from './HookObject'

// TODO: It should better to do this in after delete to avoid case when deleteUser failed
// For the moment KISS
export const defaultDeleteSessionOnDeleteUser = async (
  object: HookObject<DevWabeTypes, 'User'>,
) => {
  const userId = object.object?.id

  await object.context.wabe.controllers.database.deleteObjects({
    className: '_Session',
    context: {
      ...object.context,
      isRoot: true,
    },
    where: {
      user: { id: { equalTo: userId } },
    },
    select: {},
  })
}
