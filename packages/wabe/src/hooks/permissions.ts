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

  const res = await object.context.wabe.controllers.database.getObject({
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

  if (!permissionProperties.authorizedRoles?.includes(roleName))
    throw new Error(
      `Permission denied to ${permissionOperation} class ${object.className}`,
    )
}

export const defaultCheckPermissionOnRead = (object: HookObject<any>) =>
  _checkCLP(object, OperationType.BeforeRead)

export const defaultCheckPermissionOnCreate = (object: HookObject<any>) =>
  _checkCLP(object, OperationType.BeforeCreate)

export const defaultCheckPermissionOnUpdate = (object: HookObject<any>) =>
  _checkCLP(object, OperationType.BeforeUpdate)

export const defaultCheckPermissionOnDelete = (object: HookObject<any>) =>
  _checkCLP(object, OperationType.BeforeDelete)
