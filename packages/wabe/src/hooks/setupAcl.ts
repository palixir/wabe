import type { ACLProperties } from '../schema'
import type { HookObject } from './HookObject'

const isReadTrueOnUser = (aclObject: ACLProperties) =>
  // @ts-expect-error
  aclObject.authorizedUsers?.read?.includes('self')

const isWriteTrueOnUser = (aclObject: ACLProperties) =>
  // @ts-expect-error
  aclObject.authorizedUsers.write?.includes('self')

export const defaultSetupAcl = async (object: HookObject<any, any>) => {
  const className = object.className

  const schemaPermissionsObject =
    object.context.wabe.config.schema?.classes?.find(
      (c) => c.name === className,
    )?.permissions

  if (!schemaPermissionsObject) return

  const { acl } = schemaPermissionsObject

  if (object.isFieldUpdate('acl') || !acl) return

  // @ts-expect-error
  if (acl.callback) {
    // @ts-expect-error
    await acl.callback(object)
    return
  }

  const userId = object.getUser()?.id

  if (!userId) return

  const isReadUser = isReadTrueOnUser(acl)
  const isWriteUser = isWriteTrueOnUser(acl)

  const getIdOfAllAuthorizedRoles = async (
    // @ts-expect-error
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
    // @ts-expect-error
    acl.authorizedRoles,
    'read',
  )
  const idOfAllWriteRoles = await getIdOfAllAuthorizedRoles(
    // @ts-expect-error
    acl.authorizedRoles,
    'write',
  )

  const allRolesIdsWithoutDuplicate = [
    ...new Set([
      ...idOfAllReadRoles.map((role) => role.id),
      ...idOfAllWriteRoles.map((role) => role.id),
    ]),
  ]

  const isReadOrWriteSpecified =
    // @ts-expect-error
    (acl.authorizedUsers.read && acl.authorizedUsers.read.length > 0) ||
    // @ts-expect-error
    (acl.authorizedUsers.write && acl.authorizedUsers.write.length > 0)

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
