import type { Wabe } from '..'

export const initializeRoles = async (wabe: Wabe<any>) => {
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

  const alreadyCreatedRoles = res.map((role) => role.name)

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
