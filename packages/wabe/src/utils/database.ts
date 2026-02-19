import type { WabeTypes } from '../server'
import type { WabeContext } from '../server/interface'

export const getDatabaseController = <T extends WabeTypes>(context: WabeContext<T>) => {
	const databaseController = context.wabe.controllers?.database
	if (!databaseController) throw new Error('No database controller found')
	return databaseController
}
