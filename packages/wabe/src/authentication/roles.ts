import type { Wabe } from '..'

// TODO: Before create check if role not already exists
export const initializeRoles = async (wabe: Wabe<any>) => {
	const roles = wabe.config?.authentication?.roles || []

	if (roles.length === 0) return

	const objectsToCreate = roles.map((role) => ({
		name: role,
	}))

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
