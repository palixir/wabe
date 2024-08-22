import type { DatabaseController, WabeConfig } from '..'

export const initializeRoles = async (
	databaseController: DatabaseController<any>,
	config: WabeConfig<any>,
) => {
	const roles = config?.authentication?.roles || []

	if (roles.length === 0) return

	const objectsToCreate = roles.map((role) => ({
		name: role,
	}))

	await databaseController.createObjects({
		className: 'Role',
		context: {
			isRoot: true,
			wabeApp: { databaseController, config } as any,
		},
		data: objectsToCreate,
		fields: [],
	})
}
