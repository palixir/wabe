import {
	GraphQLBoolean,
	GraphQLEnumType,
	GraphQLFieldConfig,
	GraphQLFloat,
	GraphQLInputObjectType,
	GraphQLInt,
	GraphQLList,
	GraphQLNonNull,
	GraphQLObjectType,
	GraphQLScalarType,
	GraphQLString,
} from 'graphql'
import {
	ClassInterface,
	SchemaFields,
	TypeField,
	WibeDefaultTypes,
} from './Schema'
import {
	AnyWhereInput,
	ArrayWhereInput,
	BooleanWhereInput,
	DateScalarType,
	DateWhereInput,
	EmailScalarType,
	EmailWhereInput,
	FloatWhereInput,
	IntWhereInput,
	StringWhereInput,
} from '../graphql'

type GraphqlObjectType =
	| 'Object'
	| 'InputObject'
	| 'UpdateFieldsInput'
	| 'WhereInputObject'

type WibeDefaultTypesWithoutObject = Exclude<WibeDefaultTypes, 'Object'>

type WibeDefaultTypesWithoutArrayAndObject = Exclude<
	WibeDefaultTypesWithoutObject,
	'Array'
>

type ParseObjectOptions = {
	required?: boolean
	description?: string
	objectToParse: ClassInterface
	nameOfTheObject: string
}

type ParseObjectCallback = (options: ParseObjectOptions) => any

export const templateScalarType: Record<
	WibeDefaultTypesWithoutArrayAndObject,
	GraphQLScalarType
> = {
	String: GraphQLString,
	Int: GraphQLInt,
	Float: GraphQLFloat,
	Boolean: GraphQLBoolean,
	Date: DateScalarType,
	Email: EmailScalarType,
}

export const templateWhereInput: Record<
	Exclude<WibeDefaultTypes, 'Object'>,
	GraphQLInputObjectType
> = {
	String: StringWhereInput,
	Int: IntWhereInput,
	Float: FloatWhereInput,
	Boolean: BooleanWhereInput,
	Date: DateWhereInput,
	Email: EmailWhereInput,
	Array: ArrayWhereInput,
}

// For the moment we not support array of array (for sql database it's tricky)
// Don't export this function
// This function is only call by getGraphqlType
const _getGraphqlTypeFromTemplate = ({ field }: { field: TypeField }) => {
	if (field.type === 'Array') {
		if (!field.typeValue) throw new Error('Type value not found')
		if (field.typeValue === 'Array')
			throw new Error('Array of array are not supported')

		// We can cast because we exclude scalars and enums before in previous getGraphqlType
		return new GraphQLList(
			templateScalarType[
				field.typeValue as WibeDefaultTypesWithoutArrayAndObject
			],
		)
	}

	// We can cast because we exclude scalars and enums before in previous call getGraphqlType
	return templateScalarType[
		field.type as WibeDefaultTypesWithoutArrayAndObject
	]
}

interface GraphqlParserFactoryOptions {
	graphqlObjectType: GraphqlObjectType
	schemaFields: SchemaFields
}

interface GraphqlParserConstructorOptions {
	scalars: GraphQLScalarType[]
	enums: GraphQLEnumType[]
}

export interface GraphqlParserFactory {
	(
		options: GraphqlParserFactoryOptions,
	): {
		_parseWibeObject(options: ParseObjectOptions): any
		_parseWibeWhereInputObject(options: ParseObjectOptions): any
		_parseWibeInputObject(options: ParseObjectOptions): any
		_parseWibeUpdateInputObject(options: ParseObjectOptions): any
		getGraphqlType(options: {
			field: TypeField
			isWhereType?: boolean
		}): any
		getGraphqlFields(nameOfTheObject: string): any
	}
}

export interface GraphqlParserConstructor {
	(options: GraphqlParserConstructorOptions): GraphqlParserFactory
}

export const GraphqlParser: GraphqlParserConstructor =
	({ scalars, enums }: GraphqlParserConstructorOptions) =>
	({ graphqlObjectType, schemaFields }: GraphqlParserFactoryOptions) => {
		// Get graphql fields from a wibe object
		const _getGraphqlFieldsFromAnObject = ({
			objectToParse,
			callBackForObjectType,
			forceRequiredToFalse = false,
			isWhereType = false,
			nameOfTheObject,
		}: {
			objectToParse: ClassInterface
			forceRequiredToFalse?: boolean
			isWhereType?: boolean
			callBackForObjectType: ParseObjectCallback
			nameOfTheObject: string
		}) => {
			const fields = objectToParse.fields

			const graphqlFields = Object.keys(fields).reduce(
				(acc, key) => {
					const currentField = fields[key]

					const keyWithFirstLetterUppercase = `${key
						.charAt(0)
						.toUpperCase()}${key.slice(1)}`

					if (currentField.type === 'Object') {
						acc[key] = {
							type: callBackForObjectType({
								required: currentField.required,
								description: currentField.description,
								objectToParse: currentField.object,
								nameOfTheObject: `${nameOfTheObject}${keyWithFirstLetterUppercase}`,
							}),
						}

						return acc
					}

					const graphqlType = getGraphqlType({
						field: currentField,
						isWhereType,
					})

					acc[key] = {
						type:
							currentField.required && !forceRequiredToFalse
								? new GraphQLNonNull(graphqlType)
								: graphqlType,
					}

					return acc
				},
				{} as Record<string, any>,
			)

			return graphqlFields
		}

		// ------------------ Parsers ------------------

		// Parse simple object
		const _parseWibeObject = ({
			required,
			description,
			objectToParse,
			nameOfTheObject,
		}: ParseObjectOptions) => {
			const graphqlFields = _getGraphqlFieldsFromAnObject({
				objectToParse,
				callBackForObjectType: _parseWibeObject,
				nameOfTheObject,
			})

			const graphqlObject = new GraphQLObjectType({
				name: nameOfTheObject,
				description: description,
				fields: graphqlFields,
			})

			return required ? new GraphQLNonNull(graphqlObject) : graphqlObject
		}

		// Parse input object
		const _parseWibeInputObject = ({
			required,
			description,
			objectToParse,
			nameOfTheObject,
		}: ParseObjectOptions) => {
			const graphqlFields = _getGraphqlFieldsFromAnObject({
				objectToParse,
				callBackForObjectType: _parseWibeInputObject,
				nameOfTheObject,
			})

			const graphqlObject = new GraphQLInputObjectType({
				name: `${nameOfTheObject}Input`,
				description: description,
				fields: graphqlFields,
			})

			return required ? new GraphQLNonNull(graphqlObject) : graphqlObject
		}

		// Parse update input object
		const _parseWibeUpdateInputObject = ({
			required,
			description,
			objectToParse,
			nameOfTheObject,
		}: ParseObjectOptions) => {
			const graphqlFields = _getGraphqlFieldsFromAnObject({
				objectToParse,
				callBackForObjectType: _parseWibeUpdateInputObject,
				forceRequiredToFalse: true,
				nameOfTheObject,
			})

			const graphqlObject = new GraphQLInputObjectType({
				name: `${nameOfTheObject}UpdateFieldsInput`,
				description: description,
				fields: graphqlFields,
			})

			return required ? new GraphQLNonNull(graphqlObject) : graphqlObject
		}

		// Parse where input object
		const _parseWibeWhereInputObject = ({
			required,
			description,
			objectToParse,
			nameOfTheObject,
		}: ParseObjectOptions) => {
			const graphqlFields = _getGraphqlFieldsFromAnObject({
				objectToParse,
				callBackForObjectType: _parseWibeWhereInputObject,
				forceRequiredToFalse: true,
				isWhereType: true,
				nameOfTheObject,
			})

			// @ts-expect-error
			const graphqlObject = new GraphQLInputObjectType({
				name: `${nameOfTheObject}WhereInput`,
				description: description,
				fields: () => ({
					...graphqlFields,
					...{
						OR: {
							type: new GraphQLList(graphqlObject),
						},
						AND: {
							type: new GraphQLList(graphqlObject),
						},
					},
				}),
			})

			return required ? new GraphQLNonNull(graphqlObject) : graphqlObject
		}

		const _graphqlObjectFactory: Record<
			GraphqlObjectType,
			{
				callback: ParseObjectCallback
				isWhereType: boolean
				forceRequiredToFalse: boolean
			}
		> = {
			Object: {
				callback: _parseWibeObject,
				isWhereType: false,
				forceRequiredToFalse: false,
			},
			InputObject: {
				callback: _parseWibeInputObject,
				isWhereType: false,
				forceRequiredToFalse: false,
			},
			UpdateFieldsInput: {
				callback: _parseWibeUpdateInputObject,
				isWhereType: false,
				forceRequiredToFalse: true,
			},
			WhereInputObject: {
				callback: _parseWibeWhereInputObject,
				isWhereType: true,
				forceRequiredToFalse: true,
			},
		}

		// Get the good graphql type for a field
		const getGraphqlType = ({
			field,
			isWhereType = false,
		}: {
			field: TypeField
			isWhereType?: boolean
		}) => {
			const scalarExist = scalars.find(
				(scalar) => scalar.name === field.type,
			)
			const enumExist = enums.find((e) => e.name === field.type)

			if (isWhereType) {
				if (!Object.keys(templateWhereInput).includes(field.type))
					return AnyWhereInput

				return templateWhereInput[
					field.type as WibeDefaultTypesWithoutObject
				]
			}

			if (scalarExist) return scalarExist
			if (enumExist) return enumExist

			const graphqlType = _getGraphqlTypeFromTemplate({ field })

			if (!graphqlType)
				throw new Error(`${field.type} not exist in schema`)

			return graphqlType
		}

		// Get Graphql object from a schema fields passed in WibeGraphqlParser
		const getGraphqlFields = (nameOfTheObject: string) => {
			const { callback, forceRequiredToFalse, isWhereType } =
				_graphqlObjectFactory[graphqlObjectType]

			const keysOfObject = Object.keys(schemaFields)

			const rawFields = keysOfObject.reduce(
				(acc, key) => {
					const currentField = schemaFields[key]

					const keyWithFirstLetterUpperCase = `${key
						.charAt(0)
						.toUpperCase()}${key.slice(1)}`

					if (currentField.type === 'Object') {
						acc[key] = {
							type: callback({
								...currentField,
								objectToParse: currentField.object,
								nameOfTheObject: `${nameOfTheObject}${keyWithFirstLetterUpperCase}`,
							}),
						}

						return acc
					}

					const graphqlType = getGraphqlType({
						field: currentField,
						isWhereType,
					})

					acc[key] = {
						type:
							currentField.required && !forceRequiredToFalse
								? new GraphQLNonNull(graphqlType)
								: graphqlType,
					}

					return acc
				},
				{} as Record<string, any>,
			)

			const fieldsKey = Object.keys(rawFields)

			const graphqlFieldsOfTheObject = fieldsKey.reduce(
				(acc, key) => {
					const field = rawFields[key]

					acc[key] = field

					return acc
				},
				{} as Record<string, GraphQLFieldConfig<any, any, any>>,
			)

			return graphqlFieldsOfTheObject
		}

		return {
			getGraphqlType,
			getGraphqlFields,
			_parseWibeObject,
			_parseWibeInputObject,
			_parseWibeUpdateInputObject,
			_parseWibeWhereInputObject,
		}
	}
