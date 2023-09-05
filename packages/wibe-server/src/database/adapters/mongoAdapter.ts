import { AdapterOptions } from '.'
import { Schema } from '../../schema'

export const MongoAdapter = (options: AdapterOptions) => {
	return {
		async fillDatabase(schema: Schema) {
			console.log('Filling database')
		},
	}
}
