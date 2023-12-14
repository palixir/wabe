import {
	GraphQLBoolean,
	GraphQLEnumType,
	GraphQLFloat,
	GraphQLInputObjectType,
	GraphQLInt,
	GraphQLList,
	GraphQLNonNull,
	GraphQLScalarType,
	GraphQLString,
	GraphQLType,
} from 'graphql'
import { TypeField, WibeTypes } from './Schema'
import {
	AnyWhereInput,
	ArrayWhereInput,
	BooleanWhereInput,
	DateScalarType,
	DateWhereInput,
	FloatWhereInput,
	IntWhereInput,
	StringWhereInput,
} from '../graphql'

const templateTypeToGraphqlType: Record<any, GraphQLType> = {
	String: GraphQLString,
	Int: GraphQLInt,
	Float: GraphQLFloat,
	Boolean: GraphQLBoolean,
	Date: DateScalarType,
}

const templateWhereInput: Record<any, GraphQLInputObjectType> = {
	String: StringWhereInput,
	Int: IntWhereInput,
	Float: FloatWhereInput,
	Boolean: BooleanWhereInput,
	Date: DateWhereInput,
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
export const getGraphqlTypeFromTemplate = ({
	scalars,
	enums,
	field,
}: {
	field: TypeField
	scalars: GraphQLScalarType[]
	enums: GraphQLEnumType[]
}) => {
	if (field.type === 'Array') {
		if (!field.typeValue) throw new Error('Type value not found')
		if (field.typeValue === 'Array')
			throw new Error('Array of array are not supported')

		return new GraphQLList(templateTypeToGraphqlType[field.typeValue])
	}

	// Here we create all custom scalars and all custom enum
	if (!Object.keys(templateTypeToGraphqlType).includes(field.type)) {
		const scalarExist = scalars.find((scalar) => scalar.name === field.type)
		if (scalarExist) return scalarExist

		const enumExist = enums.find((e) => e.name === field.type)
		if (enumExist) return enumExist

		throw new Error(`${field.type} not exist in schema`)
	}

	return templateTypeToGraphqlType[field.type]
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

	return templateWhereInput[wibeType]
}
