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
import { ClassInterface, TypeField, WibeDefaultTypes } from './Schema'
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

type ParseObjectCallback = ({
	wibeObject: { required, description, object },
	scalars,
	enums,
}: {
	wibeObject: {
		required?: boolean
		description?: string
		object: ClassInterface
	}
	scalars: GraphQLScalarType[]
	enums: GraphQLEnumType[]
}) => any

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

export const getGraphqlType = ({
	scalars,
	enums,
	field,
	isWhereType = false,
}: {
	field: TypeField
	scalars: GraphQLScalarType[]
	enums: GraphQLEnumType[]
	isWhereType?: boolean
}) => {
	const scalarExist = scalars.find((scalar) => scalar.name === field.type)
	const enumExist = enums.find((e) => e.name === field.type)

	if (isWhereType) {
		if (!Object.keys(templateWhereInput).includes(field.type))
			return AnyWhereInput

		return templateWhereInput[field.type as WibeDefaultTypesWithoutObject]
	}

	if (scalarExist) return scalarExist
	if (enumExist) return enumExist

	const graphqlType = _getGraphqlTypeFromTemplate({ field })

	if (!graphqlType) throw new Error(`${field.type} not exist in schema`)

	return graphqlType
}

const _getGraphqlFields = ({
	object,
	scalars,
	enums,
	callBackForObjectType,
	forceRequiredToFalse = false,
	isWhereType = false,
}: {
	object: ClassInterface
	scalars: GraphQLScalarType[]
	enums: GraphQLEnumType[]
	forceRequiredToFalse?: boolean
	isWhereType?: boolean
	callBackForObjectType: ParseObjectCallback
}) => {
	const fields = object.fields

	const graphqlFields = Object.keys(fields).reduce(
		(acc, key) => {
			const currentField = fields[key]

			if (currentField.type === 'Object') {
				acc[key] = {
					type: callBackForObjectType({
						wibeObject: {
							required: currentField.required,
							description: currentField.description,
							object: currentField.object,
						},
						scalars,
						enums,
					}),
				}

				return acc
			}

			const graphqlType = getGraphqlType({
				field: currentField,
				scalars,
				enums,
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

export const parseWibeObject = ({
	wibeObject: { required, description, object },
	scalars,
	enums,
}: {
	wibeObject: {
		required?: boolean
		description?: string
		object: ClassInterface
	}
	scalars: GraphQLScalarType[]
	enums: GraphQLEnumType[]
}) => {
	const graphqlFields = _getGraphqlFields({
		object,
		scalars,
		enums,
		callBackForObjectType: parseWibeObject,
	})

	const graphqlObject = new GraphQLObjectType({
		name: object.name,
		description: description,
		fields: graphqlFields,
	})

	return required ? new GraphQLNonNull(graphqlObject) : graphqlObject
}

export const parseWibeInputObject = ({
	wibeObject: { required, description, object },
	scalars,
	enums,
}: {
	wibeObject: {
		required?: boolean
		description?: string
		object: ClassInterface
	}
	scalars: GraphQLScalarType[]
	enums: GraphQLEnumType[]
}) => {
	const graphqlFields = _getGraphqlFields({
		object,
		scalars,
		enums,
		callBackForObjectType: parseWibeInputObject,
	})

	const graphqlObject = new GraphQLInputObjectType({
		name: `${object.name}Input`,
		description: description,
		fields: graphqlFields,
	})

	return required ? new GraphQLNonNull(graphqlObject) : graphqlObject
}

export const parseWibeUpdateInputObject = ({
	wibeObject: { required, description, object },
	scalars,
	enums,
}: {
	wibeObject: {
		required?: boolean
		description?: string
		object: ClassInterface
	}
	scalars: GraphQLScalarType[]
	enums: GraphQLEnumType[]
}) => {
	const graphqlFields = _getGraphqlFields({
		object,
		scalars,
		enums,
		callBackForObjectType: parseWibeUpdateInputObject,
		forceRequiredToFalse: true,
	})

	const graphqlObject = new GraphQLInputObjectType({
		name: `${object.name}UpdateFieldsInput`,
		description: description,
		fields: graphqlFields,
	})

	return required ? new GraphQLNonNull(graphqlObject) : graphqlObject
}

export const parseWibeWhereInputObject = ({
	wibeObject: { required, description, object },
	scalars,
	enums,
}: {
	wibeObject: {
		required?: boolean
		description?: string
		object: ClassInterface
	}
	scalars: GraphQLScalarType[]
	enums: GraphQLEnumType[]
}) => {
	const graphqlFields = _getGraphqlFields({
		object,
		scalars,
		enums,
		callBackForObjectType: parseWibeWhereInputObject,
		forceRequiredToFalse: true,
		isWhereType: true,
	})

	// @ts-expect-error
	const graphqlObject = new GraphQLInputObjectType({
		name: `${object.name}WhereInput`,
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

const _getGraphqlObjectFactory = ({
	object,
	scalars,
	enums,
	callback,
	forceRequiredToFalse = false,
	isWhereType = false,
}: {
	object: Record<string, TypeField>
	scalars: GraphQLScalarType[]
	enums: GraphQLEnumType[]
	forceRequiredToFalse?: boolean
	isWhereType?: boolean
	callback: ({
		wibeObject: { required, description, object },
		scalars,
		enums,
	}: {
		wibeObject: {
			required?: boolean
			description?: string
			object: ClassInterface
		}
		scalars: GraphQLScalarType[]
		enums: GraphQLEnumType[]
	}) => any
}) => {
	const keysOfObject = Object.keys(object)

	return keysOfObject.reduce(
		(acc, key) => {
			const currentField = object[key]

			if (currentField.type === 'Object') {
				acc[key] = {
					type: callback({
						wibeObject: currentField,
						scalars,
						enums,
					}),
				}

				return acc
			}

			const graphqlType = getGraphqlType({
				field: currentField,
				scalars,
				enums,
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

const _graphqlObjectFactory: Record<
	GraphqlObjectType,
	{
		callback: ParseObjectCallback
		isWhereType: boolean
		forceRequiredToFalse: boolean
	}
> = {
	Object: {
		callback: parseWibeObject,
		isWhereType: false,
		forceRequiredToFalse: false,
	},
	InputObject: {
		callback: parseWibeInputObject,
		isWhereType: false,
		forceRequiredToFalse: false,
	},
	UpdateFieldsInput: {
		callback: parseWibeUpdateInputObject,
		isWhereType: false,
		forceRequiredToFalse: true,
	},
	WhereInputObject: {
		callback: parseWibeWhereInputObject,
		isWhereType: true,
		forceRequiredToFalse: true,
	},
}

export const getGraphqlObject = ({
	object,
	scalars,
	enums,
	graphqlObjectType,
}: {
	object: Record<string, TypeField>
	scalars: GraphQLScalarType[]
	enums: GraphQLEnumType[]
	graphqlObjectType: GraphqlObjectType
}) =>
	_getGraphqlObjectFactory({
		object,
		scalars,
		enums,
		..._graphqlObjectFactory[graphqlObjectType],
	})
