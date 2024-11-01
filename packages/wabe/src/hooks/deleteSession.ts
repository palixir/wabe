import type { HookObject } from './HookObject'

export const defaultDeleteSessionOnDeleteUser = async (
  object: HookObject<any, any>,
) => {
  const userId = object.object.id

  await object.context.wabe.controllers.database.deleteObjects({
    className: '_Session',
    context: {
      ...object.context,
      isRoot: true,
    },
    where: {
      user: { equalTo: userId },
    },
    fields: ['id'],
  })
}
