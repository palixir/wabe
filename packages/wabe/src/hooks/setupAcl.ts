import type { ACLProperties } from '../schema'
import type { HookObject } from './HookObject'

const isReadTrueOnUser = (aclObject: ACLProperties) =>
  aclObject.authorizedUsers?.read?.includes('self')

const isWriteTrueOnUser = (aclObject: ACLProperties) =>
  aclObject.authorizedUsers?.write?.includes('self')

export const defaultSetupAcl = async (object: HookObject<any>) => {
  const className = object.className

  const schemaPermissionsObject =
    object.context.wabe.config.schema?.classes?.find(
      (c) => c.name === className,
    )?.permissions

  if (!schemaPermissionsObject) return

  const { acl } = schemaPermissionsObject

  if (object.isFieldUpdate('acl') || !acl) return

  const { authorizedUsers, callback, authorizedRoles } = acl

  if (callback) {
    await callback(object)
    return
  }

  const userId = object.getUser()?.id

  if (!userId) return

  const isReadUser = isReadTrueOnUser(acl)
  const isWriteUser = isWriteTrueOnUser(acl)

  const getIdOfAllAuthorizedRoles = async (
    authorizedRoles: ACLProperties['authorizedRoles'],
    property: 'read' | 'write',
  ) => {
    return object.context.wabe.controllers.database.getObjects({
      className: 'Role',
      fields: ['id'],
      where: {
        name: {
          in: authorizedRoles?.[property],
        },
      },
      context: object.context,
    })
  }

  const idOfAllReadRoles = await getIdOfAllAuthorizedRoles(
    authorizedRoles,
    'read',
  )
  const idOfAllWriteRoles = await getIdOfAllAuthorizedRoles(
    authorizedRoles,
    'write',
  )

  const allRolesIdsWithoutDuplicate = [
    ...new Set([
      ...idOfAllReadRoles.map((role) => role.id),
      ...idOfAllWriteRoles.map((role) => role.id),
    ]),
  ]

  const isReadOrWriteSpecified =
    (authorizedUsers.read && authorizedUsers.read.length > 0) ||
    (authorizedUsers.write && authorizedUsers.write.length > 0)

  object.upsertNewData('acl', {
    users: isReadOrWriteSpecified
      ? [{ userId, read: !!isReadUser, write: !!isWriteUser }]
      : [],
    roles: [
      ...allRolesIdsWithoutDuplicate.map((roleId) => ({
        roleId,
        read: idOfAllReadRoles.some((role) => role.id === roleId),
        write: idOfAllWriteRoles.some((role) => role.id === roleId),
      })),
    ],
  })
}
