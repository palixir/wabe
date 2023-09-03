export type TypeField =
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

export type SchemaField = Record<string, TypeField>

export interface Schema {
	name: string
	fields: SchemaField
}
