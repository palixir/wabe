import type { Wabe } from '..'
import { notEmpty, type DevWabeTypes } from '../utils/helper'

export const initializeRoles = async (wabe: Wabe<DevWabeTypes>) => {
  const roles = wabe.config?.authentication?.roles || []

  if (roles.length === 0) return

  const res = await wabe.controllers.database.getObjects({
    className: 'Role',
    context: {
      isRoot: true,
      wabe,
    },
    fields: ['name'],
    where: {
      name: {
        in: roles,
      },
    },
  })

  const alreadyCreatedRoles = res.map((role) => role?.name).filter(notEmpty)

  const objectsToCreate = roles
    .filter((role) => !alreadyCreatedRoles.includes(role))
    .map((role) => ({ name: role }))

  if (objectsToCreate.length === 0) return

  await wabe.controllers.database.createObjects({
    className: 'Role',
    context: {
      isRoot: true,
      wabe,
    },
    data: objectsToCreate,
    fields: [],
  })
}
