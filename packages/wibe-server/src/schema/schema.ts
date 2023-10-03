import { DatabaseController } from '../database/controllers/DatabaseController'

type TypeField =
	| {
			type: 'string'
			required?: boolean
			defaultValue?: string
	  }
	| {
			type: 'number'
			required?: boolean
			defaultValue?: number
	  }
	| {
			type: 'boolean'
			required?: boolean
			defaultValue?: boolean
	  }
	| {
			type: 'array'
			required?: boolean
			defaultValue?: any[]
	  }
	| {
			type: 'object'
			required?: boolean
			defaultValue?: Record<string, any>
	  }
	| {
			type: 'date'
			required?: boolean
			defaultValue?: Date
	  }

type SchemaFields = Record<string, TypeField>

export interface SchemaInterface {
	name: string
	fields: SchemaFields
}

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

	async create() {
		this.databaseController.createClass(this.name)
	}
}
