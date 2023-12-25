import {
	type WibeSchemaEnums,
	type WibeSchemaScalars,
} from '../../generated/wibe'

export type WibeDefaultTypes =
	| 'String'
	| 'Int'
	| 'Float'
	| 'Boolean'
	| 'Date'
	| 'Email'
	| 'Array'
	| 'Object'

export type WibeTypes = WibeSchemaScalars | WibeSchemaEnums | WibeDefaultTypes

type TypeFieldBase<T, K extends WibeTypes> = {
	type: K | WibeSchemaScalars | WibeSchemaEnums
	required?: boolean
	defaultValue?: T
}

// TODO: Add tests for defaultValue (need to be update in a before save event)
export type TypeField =
	| TypeFieldBase<string, 'String'>
	| TypeFieldBase<number, 'Int'>
	| TypeFieldBase<number, 'Float'>
	| TypeFieldBase<boolean, 'Boolean'>
	| TypeFieldBase<Date, 'Date'>
	| TypeFieldBase<string, 'Email'>
	| {
			type: 'Array'
			required?: boolean
			defaultValue?: any[]
			typeValue: WibeTypes
	  }
	| {
			type: 'Object'
			required?: boolean
			object: ClassInterface
	  }

export type SchemaFields = Record<string, TypeField>

export type Resolver = {
	type: WibeTypes
	required?: boolean
	args?: {
		[key: string]: {
			type: WibeTypes
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

export interface ClassInterface {
	name: string
	fields: SchemaFields
	resolvers?: TypeResolver
}

export interface ScalarInterface {
	name: string
	description?: string
	parseValue?: (value: any) => any
	serialize?: (value: any) => any
	parseLiteral?: (ast: any) => any
}

export interface EnumInterface {
	name: string
	values: Record<string, string>
}

export interface SchemaInterface {
	class: ClassInterface[]
	scalars?: ScalarInterface[]
	enums?: EnumInterface[]
}

const wibeTypeToTypeScriptType: Record<any, string> = {
	String: 'string',
	Int: 'number',
	Float: 'number',
	Boolean: 'boolean',
	Date: 'Date',
	Array: 'any[]',
}

const getTypescriptFromWibeType = ({
	type,
	enums,
}: { type: WibeTypes; enums: EnumInterface[] }) => {
	const isEnum = enums.find((enumType) => enumType.name === type)
	if (isEnum) return type

	const typeScriptType = wibeTypeToTypeScriptType[type]
	if (!typeScriptType) return 'any'

	return typeScriptType
}

export class Schema {
	public schema: SchemaInterface

	constructor(schema: SchemaInterface) {
		this.schema = schema
	}

	getTypesFromSchema() {
		const wibeClassTypes = this.schema.class.map((schema) => {
			const fields = Object.keys(schema.fields)

			const firstTypeScriptType = getTypescriptFromWibeType({
				type: schema.fields[fields[0]].type,
				enums: this.schema.enums || [],
			})

			const fieldsRes = fields.reduce(
				(prev, current) => {
					const wibeSchemaType = schema.fields[current].type
					const typeScriptType = getTypescriptFromWibeType({
						type: wibeSchemaType,
						enums: this.schema.enums || [],
					})

					if (!typeScriptType)
						throw new Error(`Invalid type: ${wibeSchemaType}`)

					prev[current] = getTypescriptFromWibeType({
						type: wibeSchemaType,
						enums: this.schema.enums || [],
					})

					return prev
				},
				{
					[fields[0]]: firstTypeScriptType,
				},
			)

			const type = `export type ${schema.name} = ${JSON.stringify(
				fieldsRes,
				null,
				2,
			)}`

			return type.replaceAll('"', '')
		})

		const listOfScalars =
			this.schema.scalars?.map((scalar) => `"${scalar.name}"`) || []

		const wibeScalarType = `export type WibeSchemaScalars = ${listOfScalars.join(
			' | ',
		)}`

		const wibeEnumsTypes =
			this.schema.enums?.map((wibeEnum) => {
				const values = wibeEnum.values

				const enumString = Object.keys(values)
					.map((key) => {
						return `\t${key} = '${values[key]}',`
					})
					.join('\n')

				return `export enum ${wibeEnum.name} {\n${enumString}\n}`
			}) || []

		const wibeEnumsGlobalTypes =
			this.schema.enums?.map((wibeEnum) => `"${wibeEnum.name}"`) || []

		const wibeEnumsGlobalTypesString = `export type WibeSchemaEnums = ${wibeEnumsGlobalTypes.join(
			' | ',
		)}`

		const allNames = this.schema.class.map((schema) => schema.name)
		const globalWibeType = allNames.reduce(
			(prev, current) => {
				prev[current] = current
				return prev
			},
			{ [allNames[0]]: allNames[0] },
		)

		const globalWibeTypeString = `export type WibeSchemaTypes = ${JSON.stringify(
			globalWibeType,
			null,
			2,
		)}`

		return [
			...wibeClassTypes,
			wibeScalarType,
			...wibeEnumsTypes,
			wibeEnumsGlobalTypesString,
			globalWibeTypeString.replaceAll('"', ''),
		].join('\n\n')
	}
}
