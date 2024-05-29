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

export const defaultCheckPermissionOnRead = async (object: HookObject<any>, context: Context) => {

  const permissionProperties = await _getPermissionPropertiesOfAClass({
    className: object.className,
    operation: 'read'
  })

  if (!permissionProperties) return

  const sessionId = context.sessionId

  if (permissionProperties.requireAuthentication && !sessionId) throw new Error(`Permission denied to read class ${object.className}`)
}
