import { DatabaseController } from '../database/controllers/DatabaseController'
import { SchemaFields } from './interface'

export class Schema {
	private name: string
	private fields: SchemaFields
	private databaseController: DatabaseController

	constructor({
		name,
		fields,
		databaseController,
	}: {
		name: string
		fields: SchemaFields
		databaseController: DatabaseController
	}) {
		this.name = name
		this.fields = fields
		this.databaseController = databaseController
	}

	create() {
		return this.databaseController.createClass(this.name)
	}

	getFields() {
		return this.fields
	}

	getName() {
		return this.name
	}
}
