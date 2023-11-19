import { DatabaseController } from '../../database/controllers/DatabaseController'
import { SchemaRouterAdapter } from '../adapters/adaptersInterface'

export class SchemaRouterController {
	private adapter: SchemaRouterAdapter

	constructor({ adapter }: { adapter: SchemaRouterAdapter }) {
		this.adapter = adapter
	}

	createSchema() {
		return this.adapter.createSchema()
	}
}
