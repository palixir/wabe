import { Schema } from '../../schema'
import { DatabaseAdapter } from '../adapters'

export const DatabaseController = (adapter: DatabaseAdapter) => {
	return {
		async fillDatabase(schema: Schema) {
			adapter.fillDatabase(schema)
		},
	}
}
