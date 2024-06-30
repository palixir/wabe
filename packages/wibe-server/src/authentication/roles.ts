import { type DatabaseController, WibeApp, type WibeAppTypes } from '..'

export const initializeRoles = async (
	databaseController: DatabaseController<WibeAppTypes>,
) => {
	const roles = WibeApp.config?.authentication?.roles || []

	if (roles.length === 0) return

	const objectsToCreate = roles.map((role) => ({
		name: role,
	}))

	await databaseController.createObjects({
		className: 'Role',
		context: { isRoot: true, databaseController },
		data: objectsToCreate,
	})
}
