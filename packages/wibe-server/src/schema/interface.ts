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
			valueType: 'string' | 'number' | 'boolean'
			required?: boolean
			defaultValue?: any[]
	  }

export type SchemaFields = Record<string, TypeField>

export interface SchemaInterface {
	name: string
	fields: SchemaFields
}
