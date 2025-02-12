import type { PermissionsOperations } from '../schema'
import type { WabeContext } from '../server/interface'
import type { HookObject } from './HookObject'
import { OperationType } from './index'

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
  context: WabeContext<any>
}) => {
  const wabeClass = context.wabe.config.schema?.classes?.find(
    (c) => c.name === className,
  )

  if (!wabeClass) throw new Error(`Class ${className} not found in schema`)

  const permission = wabeClass.permissions?.[operation]

  return permission
}

export const _checkCLP = async (
  object: HookObject<any, any>,
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

  // If no permission is defined by default we throw an error, Zero trust principle
  if (!permissionProperties)
    throw new Error(
      `Permission denied to ${permissionOperation} class ${object.className}`,
    )

  const sessionId = object.context.sessionId

  if (!permissionProperties.requireAuthentication) return

  // User is not corrected but requireAuthentication is on true
  if (!sessionId || !object.getUser())
    throw new Error(
      `Permission denied to ${permissionOperation} class ${object.className}`,
    )

  if (permissionProperties.authorizedRoles?.includes('everyone')) return

  // authorizedRoles is empty
  if (
    permissionProperties.authorizedRoles?.length === 0 ||
    !permissionProperties
  )
    throw new Error(
      `Permission denied to ${permissionOperation} class ${object.className}`,
    )

  const res = await object.context.wabe.controllers.database.getObject({
    className: '_Session',
    id: sessionId,
    select: { id: true, user: { id: true } },
    // We need to set isRoot to true to avoid infinite loop
    context: {
      ...object.context,
      isRoot: true,
    },
  })

  // No session found
  if (!res)
    throw new Error(
      `Permission denied to ${permissionOperation} class ${object.className}`,
    )

  // User in the context is not the user found in the session
  if (object.context.user?.id !== res.user.id)
    throw new Error(
      `Permission denied to ${permissionOperation} class ${object.className}`,
    )

  const roleName = object.context.user?.role?.name

  // No role name found
  if (!roleName)
    throw new Error(
      `Permission denied to ${permissionOperation} class ${object.className}`,
    )

  // The role of the user is not included in the authorizedRoles
  if (!permissionProperties.authorizedRoles?.includes(roleName))
    throw new Error(
      `Permission denied to ${permissionOperation} class ${object.className}`,
    )
}

export const defaultCheckPermissionOnRead = (object: HookObject<any, any>) =>
  _checkCLP(object, OperationType.BeforeRead)

export const defaultCheckPermissionOnCreate = (object: HookObject<any, any>) =>
  _checkCLP(object, OperationType.BeforeCreate)

export const defaultCheckPermissionOnUpdate = (object: HookObject<any, any>) =>
  _checkCLP(object, OperationType.BeforeUpdate)

export const defaultCheckPermissionOnDelete = (object: HookObject<any, any>) =>
  _checkCLP(object, OperationType.BeforeDelete)
