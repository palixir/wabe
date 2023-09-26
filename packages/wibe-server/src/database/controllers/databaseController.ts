import { Schema } from '../../schema'
import { DatabaseAdapter } from '../adapters'

export class DatabaseController {
	private adapter: DatabaseAdapter

	constructor(adapter: DatabaseAdapter) {
		this.adapter = adapter
	}

	async fillDatabase(schema: Schema) {
		this.adapter.fillDatabase(schema)
	}
}
