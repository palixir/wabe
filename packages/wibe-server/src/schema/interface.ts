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
			type: 'Float'
			required?: boolean
			defaultValue?: number
	  }
	| {
			type: 'Boolean'
			required?: boolean
			defaultValue?: boolean
	  }
	| {
			type: 'array'
			valueType: 'String' | 'Int' | 'Boolean'
			required?: boolean
			defaultValue?: any[]
	  }

export type SchemaFields = Record<string, TypeField>

export interface SchemaInterface {
	name: string
	fields: SchemaFields
}
