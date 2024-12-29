import type { ACLProperties } from '../schema'
import { notEmpty } from '../utils/helper'
import type { HookObject } from './HookObject'

const isReadTrueOnUser = (aclObject: ACLProperties) =>
  // @ts-expect-error
  aclObject.authorizedUsers?.read?.includes('self')

const isWriteTrueOnUser = (aclObject: ACLProperties) =>
  // @ts-expect-error
  aclObject.authorizedUsers.write?.includes('self')

const setAcl = async ({
  hookObject,
  userId,
  isBeforeHook,
}: {
  hookObject: HookObject<any, any>
  userId: string
  isBeforeHook: boolean
}) => {
  const schemaPermissionsObject =
    hookObject.context.wabe.config.schema?.classes?.find(
      (c) => c.name === hookObject.className,
    )?.permissions

  if (!schemaPermissionsObject) return

  const { acl } = schemaPermissionsObject

  if (hookObject.isFieldUpdated('acl') || !acl) return

  // @ts-expect-error
  if (acl.callback) {
    // @ts-expect-error
    await acl.callback(hookObject)
    return
  }

  const isReadUser = isReadTrueOnUser(acl)
  const isWriteUser = isWriteTrueOnUser(acl)

  const getIdOfAllAuthorizedRoles = async (
    // @ts-expect-error
    authorizedRoles: ACLProperties['authorizedRoles'],
    property: 'read' | 'write',
  ) =>
    hookObject.context.wabe.controllers.database.getObjects({
      className: 'Role',
      fields: ['id'],
      where: {
        name: {
          in: authorizedRoles?.[property],
        },
      },
      context: hookObject.context,
    })

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
      ...idOfAllReadRoles.map((role) => role?.id).filter(notEmpty),
      ...idOfAllWriteRoles.map((role) => role?.id).filter(notEmpty),
    ]),
  ]

  const isReadOrWriteSpecified =
    // @ts-expect-error
    (acl.authorizedUsers.read && acl.authorizedUsers.read.length > 0) ||
    // @ts-expect-error
    (acl.authorizedUsers.write && acl.authorizedUsers.write.length > 0)

  const aclObject = {
    users: isReadOrWriteSpecified
      ? [{ userId, read: !!isReadUser, write: !!isWriteUser }]
      : [],
    roles: [
      ...allRolesIdsWithoutDuplicate.map((roleId) => ({
        roleId,
        read: idOfAllReadRoles.some((role) => role?.id === roleId),
        write: idOfAllWriteRoles.some((role) => role?.id === roleId),
      })),
    ],
  }

  if (isBeforeHook) hookObject.upsertNewData('acl', aclObject)
  else
    await hookObject.context.wabe.controllers.database.updateObject({
      className: hookObject.className,
      context: { ...hookObject.context, isRoot: true },
      id: userId,
      data: {
        acl: aclObject,
      },
      fields: [],
    })
}

export const defaultSetupAclBeforeCreate = async (
  hookObject: HookObject<any, any>,
) => {
  const userId = hookObject.getUser()?.id

  if (hookObject.className === 'User' || !userId) return

  await setAcl({ hookObject, userId, isBeforeHook: true })
}

export const defaultSetupAclOnUserAfterCreate = async (
  hookObject: HookObject<any, any>,
) => {
  const userId = hookObject.object?.id
  if (!userId) return

  await setAcl({ hookObject, userId, isBeforeHook: false })
}
