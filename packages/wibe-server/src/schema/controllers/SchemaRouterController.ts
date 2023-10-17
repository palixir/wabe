import { DatabaseController } from '../../database/controllers/DatabaseController'
import { SchemaRouterAdapter } from '../adapters'

export class SchemaRouterController {
	private adapter: SchemaRouterAdapter
	private dabataseController: DatabaseController

	constructor({
		adapter,
		databaseController,
	}: {
		adapter: SchemaRouterAdapter
		databaseController: DatabaseController
	}) {
		this.adapter = adapter
		this.dabataseController = databaseController
	}

	createSchema() {
		return this.adapter.createSchema(this.dabataseController)
	}
}
