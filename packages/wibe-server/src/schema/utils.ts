import {
	GraphQLBoolean,
	GraphQLEnumType,
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
	wibeObject: {
		required?: boolean
		description?: string
		objectToParse: ClassInterface
	}
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

export const WibeGraphQLParser = ({
	schemaFields,
	scalars,
	enums,
	graphqlObjectType,
}: {
	schemaFields: SchemaFields
	scalars: GraphQLScalarType[]
	enums: GraphQLEnumType[]
	graphqlObjectType: GraphqlObjectType
}) => {
	/*
	Get graphql fields from a wibe object
	*/
	const _getGraphqlFields = ({
		objectToParse,
		callBackForObjectType,
		forceRequiredToFalse = false,
		isWhereType = false,
	}: {
		objectToParse: ClassInterface
		forceRequiredToFalse?: boolean
		isWhereType?: boolean
		callBackForObjectType: ParseObjectCallback
	}) => {
		const fields = objectToParse.fields

		const graphqlFields = Object.keys(fields).reduce(
			(acc, key) => {
				const currentField = fields[key]

				if (currentField.type === 'Object') {
					acc[key] = {
						type: callBackForObjectType({
							wibeObject: {
								required: currentField.required,
								description: currentField.description,
								objectToParse: currentField.object,
							},
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

	/*
	Parse simple object
	*/
	const _parseWibeObject = ({
		wibeObject: { required, description, objectToParse },
	}: ParseObjectOptions) => {
		const graphqlFields = _getGraphqlFields({
			objectToParse,
			callBackForObjectType: _parseWibeObject,
		})

		const graphqlObject = new GraphQLObjectType({
			name: objectToParse.name,
			description: description,
			fields: graphqlFields,
		})

		return required ? new GraphQLNonNull(graphqlObject) : graphqlObject
	}

	/*
	Parse input object
	*/
	const _parseWibeInputObject = ({
		wibeObject: { required, description, objectToParse },
	}: ParseObjectOptions) => {
		const graphqlFields = _getGraphqlFields({
			objectToParse,
			callBackForObjectType: _parseWibeInputObject,
		})

		const graphqlObject = new GraphQLInputObjectType({
			name: `${objectToParse.name}Input`,
			description: description,
			fields: graphqlFields,
		})

		return required ? new GraphQLNonNull(graphqlObject) : graphqlObject
	}

	/*
	Parse update input object
	*/
	const _parseWibeUpdateInputObject = ({
		wibeObject: { required, description, objectToParse },
	}: ParseObjectOptions) => {
		const graphqlFields = _getGraphqlFields({
			objectToParse,
			callBackForObjectType: _parseWibeUpdateInputObject,
			forceRequiredToFalse: true,
		})

		const graphqlObject = new GraphQLInputObjectType({
			name: `${objectToParse.name}UpdateFieldsInput`,
			description: description,
			fields: graphqlFields,
		})

		return required ? new GraphQLNonNull(graphqlObject) : graphqlObject
	}

	/*
	Parse where input object
	*/
	const _parseWibeWhereInputObject = ({
		wibeObject: { required, description, objectToParse },
	}: ParseObjectOptions) => {
		const graphqlFields = _getGraphqlFields({
			objectToParse,
			callBackForObjectType: _parseWibeWhereInputObject,
			forceRequiredToFalse: true,
			isWhereType: true,
		})

		// @ts-expect-error
		const graphqlObject = new GraphQLInputObjectType({
			name: `${objectToParse.name}WhereInput`,
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

	/*
	Get the right graphql type for a field
	*/
	const getGraphqlType = ({
		field,
		isWhereType = false,
	}: {
		field: TypeField
		isWhereType?: boolean
	}) => {
		const scalarExist = scalars.find((scalar) => scalar.name === field.type)
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

		if (!graphqlType) throw new Error(`${field.type} not exist in schema`)

		return graphqlType
	}

	// Get Graphql object from a schema fields passed in WibeGraphqlParser
	const getGraphqlObject = () => {
		const { callback, forceRequiredToFalse, isWhereType } =
			_graphqlObjectFactory[graphqlObjectType]

		const keysOfObject = Object.keys(schemaFields)

		return keysOfObject.reduce(
			(acc, key) => {
				const currentField = schemaFields[key]

				if (currentField.type === 'Object') {
					acc[key] = {
						type: callback({
							wibeObject: {
								...currentField,
								objectToParse: currentField.object,
							},
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
	}

	return {
		getGraphqlType,
		getGraphqlObject,
		_parseWibeObject,
		_parseWibeInputObject,
		_parseWibeUpdateInputObject,
		_parseWibeWhereInputObject,
	}
}
