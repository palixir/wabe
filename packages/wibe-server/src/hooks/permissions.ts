import { WibeApp } from '../..'
import { Context } from '../graphql/interface'
import { type PermissionsOperations } from '../schema'
import { HookObject } from './HookObject'

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
) => {
	if (context.isRoot) return

	const permissionProperties = await _getPermissionPropertiesOfAClass({
		className: object.className,
		operation: 'read',
	})

	if (!permissionProperties) return

	const sessionId = context.sessionId

	if (permissionProperties.requireAuthentication && !sessionId)
		throw new Error(`Permission denied to read class ${object.className}`)

	const res = await WibeApp.databaseController.getObject({
		className: '_Session',
		id: sessionId,
		// @ts-expect-error
		fields: ['id', 'user.id'],
	})

	if (!res)
		throw new Error(`Permission denied to read class ${object.className}`)

	if (context.user.id !== res.user?.id)
		throw new Error(`Permission denied to read class ${object.className}`)

	const roleName = context.user.role?.name

	if (!roleName)
		throw new Error(`Permission denied to read class ${object.className}`)

	if (!permissionProperties.authorizedRoles.includes(roleName))
		throw new Error(`Permission denied to read class ${object.className}`)
}

export const defaultCheckPermissionOnRead = async (
	object: HookObject<any>,
	context: Context,
) => _checkPermissions(object, context)

export const defaultCheckPermissionOnCreate = async (
	object: HookObject<any>,
	context: Context,
) => _checkPermissions(object, context)

export const defaultCheckPermissionOnUpdate = async (
	object: HookObject<any>,
	context: Context,
) => _checkPermissions(object, context)

export const defaultCheckPermissionOnDelete = async (
	object: HookObject<any>,
	context: Context,
) => _checkPermissions(object, context)
