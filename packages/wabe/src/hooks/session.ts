import type { DevWabeTypes } from '../utils/helper'
import { notEmpty } from '../utils/export'
import type { HookObject } from './HookObject'

const getUserIdFromSessionObject = (sessionObject: any): string | undefined => {
	const user = sessionObject?.user
	if (!user) return undefined
	if (typeof user === 'string') return user
	if (typeof user === 'object' && typeof user.id === 'string') return user.id

	return undefined
}

export const defaultAfterCreateSession = async (
	hookObject: HookObject<DevWabeTypes, '_Session'>,
) => {
	const object = hookObject.object
	const userId = getUserIdFromSessionObject(object)

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
	const nextSessionIds = [...sessionsId, object?.id].filter(notEmpty)

	await databaseController.updateObject({
		className: 'User',
		id: userId,
		context: hookObject.context,
		data: {
			sessions: nextSessionIds,
		},
	})
}

export const defaultAfterDeleteSession = async (
	hookObject: HookObject<DevWabeTypes, '_Session'>,
) => {
	const object = hookObject.originalObject || hookObject.object
	const userId = getUserIdFromSessionObject(object)

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
	const nextSessionIds = newSessionsId || []

	await databaseController.updateObject({
		className: 'User',
		id: userId,
		context: hookObject.context,
		data: {
			sessions: nextSessionIds,
		},
	})
}

export const defaultBeforeUpdateSessionOnUser = (hookObject: HookObject<DevWabeTypes, 'User'>) => {
	if (hookObject.context.isRoot) return

	if (hookObject.isFieldUpdated('sessions'))
		throw new Error('Not authorized to update user sessions')
}
