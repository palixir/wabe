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
	GraphQLType,
} from 'graphql'
import { SchemaFields, TypeField, WibeDefaultTypes, WibeTypes } from './Schema'
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

const templateTypeToGraphqlType: Record<
	WibeDefaultTypesWithoutArrayAndObject,
	GraphQLType
> = {
	String: GraphQLString,
	Int: GraphQLInt,
	Float: GraphQLFloat,
	Boolean: GraphQLBoolean,
	Date: DateScalarType,
	Email: EmailScalarType,
}

const templateWhereInput: Record<
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
const getGraphqlTypeFromTemplate = ({
	field,
}: {
	field: TypeField
}) => {
	if (field.type === 'Array') {
		if (!field.typeValue) throw new Error('Type value not found')
		if (field.typeValue === 'Array')
			throw new Error('Array of array are not supported')

		// We can cast because we exclude scalars and enums before in getGraphqlType
		return new GraphQLList(
			templateTypeToGraphqlType[
				field.typeValue as WibeDefaultTypesWithoutArrayAndObject
			],
		)
	}

	// We can cast because we exclude scalars and enums before in getGraphqlType
	return templateTypeToGraphqlType[
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

	const graphqlType = getGraphqlTypeFromTemplate({ field })

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

export const getDefaultInputType = ({
	fields,
	fieldsOfObjectKeys,
	objects,
	scalars,
	enums,
	className,
}: {
	className: string
	fieldsOfObjectKeys: string[]
	fields: SchemaFields
	objects: GraphQLObjectType[]
	scalars: GraphQLScalarType[]
	enums: GraphQLEnumType[]
}) => {
	const defaultInputType = new GraphQLInputObjectType({
		name: `${className}Input`,
		fields: () => {
			return fieldsOfObjectKeys.reduce(
				(acc, fieldName) => {
					const currentField = fields[fieldName]

					if (currentField.type === 'Object') {
						acc[fieldName] = {
							type: wrapGraphQLTypeIn({
								required: !!currentField.required,
								type: getDefaultInputType({
									fields: currentField.object.fields,
									fieldsOfObjectKeys: Object.keys(
										currentField.object.fields,
									),
									objects,
									scalars,
									enums,
									className: currentField.object.name,
								}),
							}),
						}

						return acc
					}

					acc[fieldName] = {
						type: wrapGraphQLTypeIn({
							required: !!currentField.required,
							type: getGraphqlType({
								field: currentField,
								scalars,
								enums,
							}),
						}),
					}

					return acc
				},
				{} as Record<string, any>,
			)
		},
	})

	return defaultInputType
}

export const getWhereInputType = ({
	fields,
	fieldsOfObjectKeys,
	objects,
	scalars,
	enums,
	className,
}: {
	className: string
	fieldsOfObjectKeys: string[]
	fields: SchemaFields
	objects: GraphQLObjectType[]
	scalars: GraphQLScalarType[]
	enums: GraphQLEnumType[]
}) => {
	const whereInputType = new GraphQLInputObjectType({
		name: `${className}WhereInput`,
		fields: () => {
			const whereInputObject = fieldsOfObjectKeys.reduce(
				(acc, fieldName) => {
					const currentField = fields[fieldName]
					const typeOfObject = currentField.type

					if (currentField.type === 'Object') {
						acc[fieldName] = {
							type: getWhereInputType({
								fields: currentField.object.fields,
								fieldsOfObjectKeys: Object.keys(
									currentField.object.fields,
								),
								objects,
								scalars,
								enums,
								className: currentField.object.name,
							}),
						}

						return acc
					}

					acc[fieldName] = {
						type: getWhereInputFromType({
							wibeType: typeOfObject,
							scalars,
							enums,
						}),
					}

					return acc
				},
				{} as Record<string, any>,
			)

			const conditionFields: Record<string, any> = {
				OR: {
					type: new GraphQLList(whereInputType),
				},
				AND: {
					type: new GraphQLList(whereInputType),
				},
			}

			return {
				...whereInputObject,
				...conditionFields,
			} as Record<string, any>
		},
	})

	return whereInputType
}

export const getOutputType = ({
	allObjects,
	object,
}: { allObjects: GraphQLObjectType[]; object: GraphQLObjectType }) => {
	// We search in all object the corresponding output object
	const outputObject = allObjects.find(
		(o) => o.name === `${object.name}Output`,
	)
	if (!outputObject)
		throw new Error(`Output type not found for ${object.name}`)

	return outputObject
}
