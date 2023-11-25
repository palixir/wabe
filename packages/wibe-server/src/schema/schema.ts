export type ArrayValueType = 'String' | 'Int' | 'Float' | 'Boolean'

export enum WibeScalarType {
	String = 'String',
	Int = 'Int',
	Float = 'Float',
	Boolean = 'Boolean',
}

export type TypeField =
	| {
			type: WibeScalarType.String
			required?: boolean
			defaultValue?: string
	  }
	| {
			type: WibeScalarType.Int
			required?: boolean
			defaultValue?: number
	  }
	| {
			type: WibeScalarType.Float
			required?: boolean
			defaultValue?: number
	  }
	| {
			type: WibeScalarType.Boolean
			required?: boolean
			defaultValue?: boolean
	  }

export type SchemaFields = Record<string, TypeField>

export interface SchemaInterface {
	name: string
	fields: SchemaFields
}

const wibeTypToTypeScriptType: Record<WibeScalarType, string> = {
	[WibeScalarType.String]: 'string',
	[WibeScalarType.Int]: 'number',
	[WibeScalarType.Float]: 'number',
	[WibeScalarType.Boolean]: 'boolean',
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
				wibeTypToTypeScriptType[schema.fields[fields[0]].type]

			if (!firstTypeScriptType)
				throw new Error(
					`Invalid type: ${schema.fields[fields[0]].type}`,
				)

			const res = fields.reduce(
				(prev, current) => {
					const WibeScalarType = schema.fields[current].type
					const typeScriptType =
						wibeTypToTypeScriptType[WibeScalarType]

					if (!typeScriptType)
						throw new Error(`Invalid type: ${WibeScalarType}`)

					return {
						...prev,
						[current]: wibeTypToTypeScriptType[WibeScalarType],
					}
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
				return { ...prev, [current]: current }
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
