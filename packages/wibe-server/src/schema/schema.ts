export enum WibeSchemaType {
	String = 'String',
	Int = 'Int',
	Float = 'Float',
	Boolean = 'Boolean',
	Date = 'Date',
	Array = 'Array',
}

type TypeFieldBase<T, K extends WibeSchemaType> = {
	type: K
	required?: boolean
	defaultValue?: T
}

// TODO: Add tests for default value
export type TypeField =
	| TypeFieldBase<string, WibeSchemaType.String>
	| TypeFieldBase<number, WibeSchemaType.Int>
	| TypeFieldBase<number, WibeSchemaType.Float>
	| TypeFieldBase<boolean, WibeSchemaType.Boolean>
	| TypeFieldBase<Date, WibeSchemaType.Date>
	| {
			type: WibeSchemaType.Array
			required?: boolean
			defaultValue?: any[]
			typeValue: WibeSchemaType
	  }

export type SchemaFields = Record<string, TypeField>

export type Resolver = {
	type: WibeSchemaType
	required?: boolean
	args?: {
		[key: string]: {
			type: WibeSchemaType
			required?: boolean
		}
	}
	resolve: (...args: any) => any
}

export type TypeResolver = {
	queries?: {
		[key: string]: Resolver
	}
	mutations?: {
		[key: string]: Resolver
	}
}

export interface SchemaInterface {
	name: string
	fields: SchemaFields
	resolvers?: TypeResolver
}

const wibeTypeToTypeScriptType: Record<WibeSchemaType, string> = {
	[WibeSchemaType.String]: 'string',
	[WibeSchemaType.Int]: 'number',
	[WibeSchemaType.Float]: 'number',
	[WibeSchemaType.Boolean]: 'boolean',
	[WibeSchemaType.Date]: 'Date',
	[WibeSchemaType.Array]: 'any[]',
}

export class Schema {
	public schema: SchemaInterface[]

	constructor(schema: SchemaInterface[]) {
		this.schema = schema
	}

	getTypesFromSchema() {
		const wibeTypes = this.schema.map((schema) => {
			const fields = Object.keys(schema.fields)

			const firstTypeScriptType =
				wibeTypeToTypeScriptType[schema.fields[fields[0]].type]

			if (!firstTypeScriptType)
				throw new Error(
					`Invalid type: ${schema.fields[fields[0]].type}`,
				)

			const res = fields.reduce(
				(prev, current) => {
					const WibeSchemaType = schema.fields[current].type
					const typeScriptType =
						wibeTypeToTypeScriptType[WibeSchemaType]

					if (!typeScriptType)
						throw new Error(`Invalid type: ${WibeSchemaType}`)

					prev[current] = wibeTypeToTypeScriptType[WibeSchemaType]

					return prev
				},
				{
					[fields[0]]: firstTypeScriptType,
				},
			)

			const type = `export type ${schema.name} = ${JSON.stringify(
				res,
				null,
				2,
			)}`

			return type.replaceAll('"', '')
		})

		const allNames = this.schema.map((schema) => schema.name)
		const globalWibeType = allNames.reduce(
			(prev, current) => {
				prev[current] = current
				return prev
			},
			{ [allNames[0]]: allNames[0] },
		)

		const globalWibeTypeString = `export type WibeTypes = ${JSON.stringify(
			globalWibeType,
			null,
			2,
		)}`

		return [...wibeTypes, globalWibeTypeString.replaceAll('"', '')].join(
			'\n',
		)
	}
}
