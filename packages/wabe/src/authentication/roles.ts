import type { Wabe } from '..'

export const initializeRoles = async (wabeApp: Wabe<any>) => {
	const roles = wabeApp.config?.authentication?.roles || []

	if (roles.length === 0) return

	const objectsToCreate = roles.map((role) => ({
		name: role,
	}))

	await wabeApp.controllers.database.createObjects({
		className: 'Role',
		context: {
			isRoot: true,
			wabeApp,
		},
		data: objectsToCreate,
		fields: [],
	})
}
