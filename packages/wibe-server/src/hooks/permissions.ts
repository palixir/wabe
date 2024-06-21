import { WibeApp } from '../..'
import { _RoleAclObject } from '../../generated/wibe'
import type { PermissionsOperations } from '../schema'
import type { HookObject } from './HookObject'
import { OperationType } from './index'

type ACL = {
	roles: Array<{ roleId: string; read: boolean; write: boolean }>
	users: Array<{ userId: string; read: boolean; write: boolean }>
}

const convertOperationTypeToPermission = (operationType: OperationType) => {
	const template: Record<OperationType, PermissionsOperations> = {
		[OperationType.BeforeCreate]: 'create',
		[OperationType.AfterInsert]: 'create',
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

const isReadOperation = (operationType: OperationType) =>
	operationType === OperationType.BeforeRead ||
	operationType === OperationType.AfterRead

const isWriteOperation = (operationType: OperationType) =>
	operationType === OperationType.BeforeCreate ||
	operationType === OperationType.AfterInsert ||
	operationType === OperationType.BeforeUpdate ||
	operationType === OperationType.AfterUpdate ||
	operationType === OperationType.BeforeDelete ||
	operationType === OperationType.AfterDelete

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

	if (
		isReadOperation(operationType) &&
		((user && !user.read) || (role && !role.read) || (!role && !user))
	)
		throw new Error(
			`Permission denied to read class ${hookObject.className}`,
		)

	if (
		isWriteOperation(operationType) &&
		((user && !user.write) || (role && !role.write) || (!role && !user))
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
	})

	if (!permissionProperties) return

	const sessionId = object.context.sessionId

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
		// We need to set isRoot to true to avoid infinite loop
		context: { isRoot: true },
	})

	if (!res)
		throw new Error(
			`Permission denied to ${permissionOperation} class ${object.className}`,
		)

	if (object.context.user?.id !== res.user?.id)
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
