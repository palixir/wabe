import { WibeApp } from '../server'

export type ArrayValueType = 'String' | 'Int' | 'Float' | 'Boolean'

export enum WibeType {
	String = 'String',
	Int = 'Int',
	Float = 'Float',
	Boolean = 'Boolean',
}

export type TypeField =
	| {
			type: WibeType.String
			required?: boolean
			defaultValue?: string
	  }
	| {
			type: WibeType.Int
			required?: boolean
			defaultValue?: number
	  }
	| {
			type: WibeType.Float
			required?: boolean
			defaultValue?: number
	  }
	| {
			type: WibeType.Boolean
			required?: boolean
			defaultValue?: boolean
	  }
	| {
			type: 'array'
			valueType: ArrayValueType
			required?: boolean
			defaultValue?: any[]
	  }

export type SchemaFields = Record<string, TypeField>

export interface SchemaInterface {
	name: string
	fields: SchemaFields
}

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
