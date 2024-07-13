import type { PermissionsOperations } from '../schema'
import type { WibeContext } from '../server/interface'
import type { HookObject } from './HookObject'
import { OperationType } from './index'

type ACL = {
	roles: Array<{ roleId: string; read: boolean; write: boolean }>
	users: Array<{ userId: string; read: boolean; write: boolean }>
}

const convertOperationTypeToPermission = (operationType: OperationType) => {
	const template: Record<OperationType, PermissionsOperations> = {
		[OperationType.BeforeCreate]: 'create',
		[OperationType.AfterCreate]: 'create',
		[OperationType.BeforeRead]: 'read',
		[OperationType.AfterRead]: 'read',
		[OperationType.BeforeDelete]: 'delete',
		[OperationType.AfterDelete]: 'delete',
		[OperationType.BeforeUpdate]: 'update',
		[OperationType.AfterUpdate]: 'update',
	}

	return template[operationType]
}

export const _getPermissionPropertiesOfAClass = async ({
	className,
	operation,
	context,
}: {
	className: string
	operation: PermissionsOperations
	context: WibeContext<any>
}) => {
	const wibeClass = context.wibe.config.schema.classes.find(
		(c) => c.name === className,
	)

	if (!wibeClass) throw new Error(`Class ${className} not found in schema`)

	const permission = wibeClass.permissions?.[operation]

	return permission
}

const isReadOperation = (operationType: OperationType) =>
	operationType === OperationType.BeforeRead ||
	operationType === OperationType.AfterRead

const isWriteOperation = (operationType: OperationType) =>
	operationType === OperationType.BeforeCreate ||
	operationType === OperationType.AfterCreate ||
	operationType === OperationType.BeforeUpdate ||
	operationType === OperationType.AfterUpdate ||
	operationType === OperationType.BeforeDelete ||
	operationType === OperationType.AfterDelete

// Only call when we have id
export const _checkACL = async (
	hookObject: HookObject<any>,
	operationType: OperationType,
) => {
	if (hookObject.context.isRoot) return

	const concernedObject = hookObject.object
	const acl = concernedObject.acl as ACL

	if (!acl) return

	const { roles, users } = acl

	if (!roles && !users) return

	const role = roles?.find(
		(currentRole) =>
			currentRole.roleId === hookObject.context.user?.role?.id,
	)

	const user = users?.find(
		(currentUser) => currentUser.userId === hookObject.context.user?.id,
	)

	// User permission is more granular so it always had the priority
	if (
		isReadOperation(operationType) &&
		((user && !user.read) ||
			(user && !user.read && role && !role.read) ||
			(!role && !user))
	) {
		throw new Error(
			`Permission denied to read class ${hookObject.className}`,
		)
	}

	if (
		isWriteOperation(operationType) &&
		((user && !user.write) ||
			(user && !user.write && role && !role.write) ||
			(!role && !user))
	)
		throw new Error(
			`Permission denied to write class ${hookObject.className}`,
		)
}

export const _checkCLP = async (
	object: HookObject<any>,
	operationType: OperationType,
) => {
	if (object.context.isRoot) return

	const permissionOperation = convertOperationTypeToPermission(operationType)

	if (!permissionOperation) throw new Error('Bad operation type provided')

	const permissionProperties = await _getPermissionPropertiesOfAClass({
		className: object.className,
		operation: permissionOperation,
		context: object.context,
	})

	if (!permissionProperties) return

	const sessionId = object.context.sessionId

	if (!permissionProperties.requireAuthentication) return

	if (!sessionId)
		throw new Error(
			`Permission denied to ${permissionOperation} class ${object.className}`,
		)

	const res = await object.context.wibe.databaseController.getObject({
		className: '_Session',
		id: sessionId,
		fields: ['id', 'user.id'],
		// We need to set isRoot to true to avoid infinite loop
		context: {
			...object.context,
			isRoot: true,
		},
	})

	if (!res)
		throw new Error(
			`Permission denied to ${permissionOperation} class ${object.className}`,
		)

	// @ts-expect-error
	if (object.context.user?.id !== res.user.id)
		throw new Error(
			`Permission denied to ${permissionOperation} class ${object.className}`,
		)

	const roleName = object.context.user?.role?.name

	if (!roleName)
		throw new Error(
			`Permission denied to ${permissionOperation} class ${object.className}`,
		)

	if (!permissionProperties.authorizedRoles.includes(roleName))
		throw new Error(
			`Permission denied to ${permissionOperation} class ${object.className}`,
		)
}

const _checkPermissions = async (
	object: HookObject<any>,
	operationType: OperationType,
) => {
	await _checkCLP(object, operationType)
	await _checkACL(object, operationType)
}

export const defaultCheckPermissionOnRead = (object: HookObject<any>) =>
	_checkPermissions(object, OperationType.BeforeRead)

export const defaultCheckPermissionOnCreate = (object: HookObject<any>) =>
	_checkPermissions(object, OperationType.BeforeCreate)

export const defaultCheckPermissionOnUpdate = (object: HookObject<any>) =>
	_checkPermissions(object, OperationType.BeforeUpdate)

export const defaultCheckPermissionOnDelete = (object: HookObject<any>) =>
	_checkPermissions(object, OperationType.BeforeDelete)
