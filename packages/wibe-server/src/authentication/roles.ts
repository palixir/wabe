import { WibeApp } from '..'

export const initializeRoles = async () => {
	const roles = WibeApp.config?.authentication?.roles || []

	if (roles.length === 0) return

	const objectsToCreate = roles.map((role) => ({
		name: role,
	}))

	await WibeApp.databaseController.createObjects({
		className: 'Role',
		context: { isRoot: true },
		data: objectsToCreate,
	})
}
