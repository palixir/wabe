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
	GraphQLType,
} from 'graphql'
import {
	ClassInterface,
	SchemaFields,
	TypeField,
	WibeDefaultTypes,
	WibeTypes,
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

type WibeDefaultTypesWithoutObject = Exclude<WibeDefaultTypes, 'Object'>

type WibeDefaultTypesWithoutArrayAndObject = Exclude<
	WibeDefaultTypesWithoutObject,
	'Array'
>

const graphqlObjects: Array<GraphQLObjectType> = []
const graphqlInputObjects: Array<GraphQLInputObjectType> = []

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

export const wrapGraphQLTypeIn = ({
	required,
	type,
}: {
	required: boolean
	type: GraphQLType
}) => (required ? new GraphQLNonNull(type) : type)

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
}: {
	field: TypeField
	scalars: GraphQLScalarType[]
	enums: GraphQLEnumType[]
}) => {
	const scalarExist = scalars.find((scalar) => scalar.name === field.type)
	if (scalarExist) return scalarExist

	const enumExist = enums.find((e) => e.name === field.type)
	if (enumExist) return enumExist

	const graphqlType = _getGraphqlTypeFromTemplate({ field })

	if (!graphqlType) throw new Error(`${field.type} not exist in schema`)

	return graphqlType
}

export const getWhereInputFromType = ({
	wibeType,
	scalars,
	enums,
}: {
	wibeType: WibeTypes
	scalars: GraphQLScalarType[]
	enums: GraphQLEnumType[]
}) => {
	if (!Object.keys(templateWhereInput).includes(wibeType)) {
		const scalarExist = scalars.find((scalar) => scalar.name === wibeType)
		if (scalarExist) return scalarExist

		const enumExist = enums.find((e) => e.name === wibeType)

		if (!scalarExist && !enumExist)
			throw new Error(`${wibeType} not exist in schema`)

		return AnyWhereInput
	}

	return templateWhereInput[wibeType as WibeDefaultTypesWithoutObject]
}

export const getConnectionType = ({
	allObjects,
	object,
}: {
	allObjects: GraphQLObjectType[]
	object: GraphQLObjectType
}) => {
	// We search in all object the corresponding output object
	const connection = allObjects.find(
		(o) => o.name === `${object.name}Connection`,
	)
	if (!connection)
		throw new Error(`Connection type not found for ${object.name}`)

	return connection
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
	const fields = object.fields

	const graphqlFields = Object.keys(fields).reduce(
		(acc, key) => {
			const currentField = fields[key]

			if (currentField.type === 'Object') {
				acc[key] = {
					type: parseWibeObject({
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
			})

			acc[key] = {
				type: currentField.required
					? new GraphQLNonNull(graphqlType)
					: graphqlType,
			}

			return acc
		},
		{} as Record<string, any>,
	)

	const graphqlObject = new GraphQLObjectType({
		name: object.name,
		description: description,
		fields: () => ({
			...graphqlFields,
		}),
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
	const fields = object.fields

	const graphqlFields = Object.keys(fields).reduce(
		(acc, key) => {
			const currentField = fields[key]

			if (currentField.type === 'Object') {
				acc[key] = {
					type: parseWibeInputObject({
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
			})

			acc[key] = {
				type: currentField.required
					? new GraphQLNonNull(graphqlType)
					: graphqlType,
			}

			return acc
		},
		{} as Record<string, any>,
	)

	const graphqlObject = new GraphQLInputObjectType({
		name: `${object.name}Input`,
		description: description,
		fields: () => ({
			...graphqlFields,
		}),
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
	const fields = object.fields

	const graphqlFields = Object.keys(fields).reduce(
		(acc, key) => {
			const currentField = fields[key]

			if (currentField.type === 'Object') {
				acc[key] = {
					type: parseWibeUpdateInputObject({
						wibeObject: {
							required: false,
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
			})

			acc[key] = {
				type: graphqlType,
			}

			return acc
		},
		{} as Record<string, any>,
	)

	const graphqlObject = new GraphQLInputObjectType({
		name: `${object.name}UpdateFieldsInput`,
		description: description,
		fields: () => ({
			...graphqlFields,
		}),
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
	const fields = object.fields

	const graphqlFields = Object.keys(fields).reduce(
		(acc, key) => {
			const currentField = fields[key]

			if (currentField.type === 'Object') {
				acc[key] = {
					type: parseWibeWhereInputObject({
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

			const graphqlType = getWhereInputFromType({
				wibeType: currentField.type,
				scalars,
				enums,
			})

			acc[key] = {
				type: graphqlType,
			}

			return acc
		},
		{} as Record<string, any>,
	)

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

export const getGraphqlObjectFromWibeObject = ({
	object,
	scalars,
	enums,
}: {
	object: Record<string, TypeField>
	scalars: GraphQLScalarType[]
	enums: GraphQLEnumType[]
}) => {
	const keysOfObject = Object.keys(object)

	const res = keysOfObject.reduce(
		(acc, key) => {
			const currentField = object[key]

			if (currentField.type === 'Object') {
				acc[key] = {
					type: parseWibeObject({
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
			})

			acc[key] = {
				type: currentField.required
					? new GraphQLNonNull(graphqlType)
					: graphqlType,
			}

			return acc
		},
		{} as Record<string, any>,
	)

	return res
}

export const getGraphqlObjectFromWibeInputObject = ({
	object,
	scalars,
	enums,
}: {
	object: Record<string, TypeField>
	scalars: GraphQLScalarType[]
	enums: GraphQLEnumType[]
}) => {
	const keysOfObject = Object.keys(object)

	const res = keysOfObject.reduce(
		(acc, key) => {
			const currentField = object[key]

			if (currentField.type === 'Object') {
				acc[key] = {
					type: parseWibeInputObject({
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
			})

			acc[key] = {
				type: currentField.required
					? new GraphQLNonNull(graphqlType)
					: graphqlType,
			}

			return acc
		},
		{} as Record<string, any>,
	)

	return res
}

export const getGraphqlObjectFromWibeUpdateInputObject = ({
	object,
	scalars,
	enums,
}: {
	object: Record<string, TypeField>
	scalars: GraphQLScalarType[]
	enums: GraphQLEnumType[]
}) => {
	const keysOfObject = Object.keys(object)

	const res = keysOfObject.reduce(
		(acc, key) => {
			const currentField = object[key]

			if (currentField.type === 'Object') {
				acc[key] = {
					type: parseWibeUpdateInputObject({
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
			})

			acc[key] = {
				type: graphqlType,
			}

			return acc
		},
		{} as Record<string, any>,
	)

	return res
}

export const getGraphqlObjectFromWibeWhereInputObject = ({
	object,
	scalars,
	enums,
}: {
	object: Record<string, TypeField>
	scalars: GraphQLScalarType[]
	enums: GraphQLEnumType[]
}) => {
	const keysOfObject = Object.keys(object)

	const res = keysOfObject.reduce(
		(acc, key) => {
			const currentField = object[key]

			if (currentField.type === 'Object') {
				acc[key] = {
					type: parseWibeWhereInputObject({
						wibeObject: currentField,
						scalars,
						enums,
					}),
				}

				return acc
			}

			const graphqlType = getWhereInputFromType({
				wibeType: currentField.type,
				scalars,
				enums,
			})

			acc[key] = {
				type: graphqlType,
			}

			return acc
		},
		{} as Record<string, any>,
	)

	return res
}
