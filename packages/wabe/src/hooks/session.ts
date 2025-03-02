import { notEmpty, type DevWabeTypes } from '../utils/helper'
import type { HookObject } from './HookObject'

export const defaultAfterCreateSession = async (
  hookObject: HookObject<DevWabeTypes, '_Session'>,
) => {
  const object = hookObject.object
  // @ts-expect-error
  const userId = object?.user as string

  if (!userId) return

  const databaseController = hookObject.context.wabe.controllers.database

  const user = await databaseController.getObject({
    className: 'User',
    id: userId,
    select: {
      sessions: true,
    },
    context: hookObject.context,
  })

  const sessionsId = user?.sessions?.map((session) => session.id) || []

  await databaseController.updateObject({
    className: 'User',
    id: userId,
    context: hookObject.context,
    data: {
      sessions: [...sessionsId, object?.id].filter(notEmpty),
    },
  })
}

export const defaultAfterDeleteSession = async (
  hookObject: HookObject<DevWabeTypes, '_Session'>,
) => {
  const object = hookObject.object
  // @ts-expect-error
  const userId = object?.user as string

  if (!userId) return

  const databaseController = hookObject.context.wabe.controllers.database

  const user = await databaseController.getObject({
    className: 'User',
    id: userId,
    select: {
      sessions: true,
    },
    context: hookObject.context,
  })

  const newSessionsId = user?.sessions
    ?.filter((session) => session.id !== object?.id)
    .map((session) => session.id)

  await databaseController.updateObject({
    className: 'User',
    id: userId,
    context: hookObject.context,
    data: {
      sessions: newSessionsId,
    },
  })
}

export const defaultBeforeUpdateSessionOnUser = (
  hookObject: HookObject<DevWabeTypes, 'User'>,
) => {
  if (hookObject.context.isRoot) return

  if (hookObject.isFieldUpdated('sessions'))
    throw new Error('Not authorized to update user sessions')
}
