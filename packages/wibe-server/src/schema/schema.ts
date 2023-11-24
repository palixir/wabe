import { WibeApp } from '../server'
import { SchemaFields } from './interface'

export class Schema {
	public name: string
	public fields: SchemaFields

	constructor({ name, fields }: { name: string; fields: SchemaFields }) {
		this.name = name
		this.fields = fields
	}

	create() {
		return WibeApp.databaseController.createClass(this.name)
	}

	getFields() {
		return this.fields
	}

	getName() {
		return this.name
	}
}
