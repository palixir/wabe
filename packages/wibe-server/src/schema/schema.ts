import { WibeSchemaScalars } from '../../generated/wibe'

export type WibeDefaultTypes =
	| 'String'
	| 'Int'
	| 'Float'
	| 'Boolean'
	| 'Date'
	| 'Array'

export type WibeTypes = WibeSchemaScalars | WibeDefaultTypes

type TypeFieldBase<T, K extends WibeTypes> = {
	type: K | WibeSchemaScalars
	required?: boolean
	defaultValue?: T
}

// TODO: Add tests for default value
export type TypeField =
	| TypeFieldBase<string, 'String'>
	| TypeFieldBase<number, 'Int'>
	| TypeFieldBase<number, 'Float'>
	| TypeFieldBase<boolean, 'Boolean'>
	| TypeFieldBase<Date, 'Date'>
	| {
			type: 'Array'
			required?: boolean
			defaultValue?: any[]
			typeValue: WibeTypes
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

export interface SchemaInterface {
	class: ClassInterface[]
	scalars?: ScalarInterface[]
}

const wibeTypeToTypeScriptType: Record<WibeDefaultTypes, string> = {
	String: 'string',
	Int: 'number',
	Float: 'number',
	Boolean: 'boolean',
	Date: 'Date',
	Array: 'any[]',
}

const getTypescriptFromWibeType = (type: WibeTypes) => {
	return wibeTypeToTypeScriptType[type as WibeDefaultTypes]
}

export class Schema {
	public schema: SchemaInterface

	constructor(schema: SchemaInterface) {
		this.schema = schema
	}

	getTypesFromSchema() {
		const wibeClassTypes = this.schema.class.map((schema) => {
			const fields = Object.keys(schema.fields)

			const firstTypeScriptType = getTypescriptFromWibeType(
				schema.fields[fields[0]].type,
			)

			if (!firstTypeScriptType)
				throw new Error(
					`Invalid type: ${schema.fields[fields[0]].type}`,
				)

			const fieldsRes = fields.reduce(
				(prev, current) => {
					const wibeSchemaType = schema.fields[current].type
					const typeScriptType =
						getTypescriptFromWibeType(wibeSchemaType)

					if (!typeScriptType)
						throw new Error(`Invalid type: ${wibeSchemaType}`)

					prev[current] = getTypescriptFromWibeType(wibeSchemaType)

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
			this.schema.scalars?.map((scalar) => {
				return `"${scalar.name}"`
			}) || []

		const wibeScalarTypes = [
			`export type WibeSchemaScalars = ${listOfScalars.join(' | ')}`,
		]

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
			...wibeScalarTypes,
			globalWibeTypeString.replaceAll('"', ''),
		].join('\n')
	}
}
