import { Schema } from '../Schema'
import { SchemaRouterAdapter } from '../adapters'

export class SchemaRouterController {
	private adapter: SchemaRouterAdapter

	constructor(adapter: SchemaRouterAdapter) {
		this.adapter = adapter
	}

	createSchema() {
		return this.adapter.createSchema()
	}
}
