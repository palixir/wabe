import { WibeApp } from '../..'
import type { Context } from '../graphql/interface'
import type { PermissionsOperations } from '../schema'
import type { HookObject } from './HookObject'
import { BeforeOperationType } from './index'

const convertOperationTypeToPermission = (
	beforeOperationType: BeforeOperationType,
) => {
	const template: Record<BeforeOperationType, PermissionsOperations> = {
		[BeforeOperationType.BeforeCreate]: 'create',
		[BeforeOperationType.BeforeRead]: 'read',
		[BeforeOperationType.BeforeDelete]: 'delete',
		[BeforeOperationType.BeforeUpdate]: 'update',
	}

	return template[beforeOperationType]
}

export const _getPermissionPropertiesOfAClass = async ({
	className,
	operation,
}: {
	className: string
	operation: PermissionsOperations
}) => {
	const wibeClass = WibeApp.config.schema.class.find(
		(c) => c.name === className,
	)

	if (!wibeClass) throw new Error(`Class ${className} not found in schema`)

	const permission = wibeClass.permissions?.[operation]

	return permission
}

export const _checkPermissions = async (
	object: HookObject<any>,
	context: Context,
	operationType: BeforeOperationType,
) => {
	console.log({ context })
	if (context.isRoot) return

	const permissionOperation = convertOperationTypeToPermission(operationType)

	if (!permissionOperation) throw new Error('Bad operation type provided')

	const permissionProperties = await _getPermissionPropertiesOfAClass({
		className: object.className,
		operation: permissionOperation,
	})

	if (!permissionProperties) return

	const sessionId = context.sessionId

	if (!permissionProperties.requireAuthentication) return

	if (!sessionId)
		throw new Error(
			`Permission denied to ${permissionOperation} class ${object.className}`,
		)

	const res = await WibeApp.databaseController.getObject({
		className: '_Session',
		id: sessionId,
		// @ts-expect-error
		fields: ['id', 'user.id'],
	})

	if (!res)
		throw new Error(
			`Permission denied to ${permissionOperation} class ${object.className}`,
		)

	if (context.user?.id !== res.user?.id)
		throw new Error(
			`Permission denied to ${permissionOperation} class ${object.className}`,
		)

	const roleName = context.user?.role?.name

	if (!roleName)
		throw new Error(
			`Permission denied to ${permissionOperation} class ${object.className}`,
		)

	if (!permissionProperties.authorizedRoles.includes(roleName))
		throw new Error(
			`Permission denied to ${permissionOperation} class ${object.className}`,
		)
}

export const defaultCheckPermissionOnRead = (object: HookObject<any>) =>
	_checkPermissions(object, object.context, BeforeOperationType.BeforeRead)

export const defaultCheckPermissionOnCreate = (object: HookObject<any>) =>
	_checkPermissions(object, object.context, BeforeOperationType.BeforeCreate)

export const defaultCheckPermissionOnUpdate = (object: HookObject<any>) =>
	_checkPermissions(object, object.context, BeforeOperationType.BeforeUpdate)

export const defaultCheckPermissionOnDelete = (object: HookObject<any>) =>
	_checkPermissions(object, object.context, BeforeOperationType.BeforeDelete)
