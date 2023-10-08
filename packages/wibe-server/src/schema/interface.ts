export type TypeField =
	| {
			type: 'String'
			required?: boolean
			defaultValue?: string
	  }
	| {
			type: 'Int'
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
