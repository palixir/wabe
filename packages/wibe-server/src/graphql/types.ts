import {
	Kind,
	GraphQLBoolean,
	GraphQLFloat,
	GraphQLInputObjectType,
	GraphQLInt,
	GraphQLList,
	GraphQLScalarType,
	GraphQLString,
} from 'graphql'

export const AnyScalarType = new GraphQLScalarType({
	name: 'Any',
	description:
		'The Any scalar type is used in operations and types that involve any type of value.',
	parseValue: (value) => value,
	serialize: (value) => value,
})

export const DateScalarType = new GraphQLScalarType({
	name: 'Date',
	description: 'Date scalar type',
	parseValue(value: any) {
		const date = new Date(value)

		if (Number.isNaN(date.getTime())) throw new Error('Invalid date')

		return date
	},
	serialize(value: any) {
		return value.toISOString()
	},
})

export const EmailScalarType = new GraphQLScalarType({
	name: 'Email',
	description: 'Email scalar type',
	parseValue(value: any) {
		if (typeof value !== 'string') throw new Error('Invalid email')

		if (!value.match(/^[^@\s]+@[^@\s]+\.[^@\s]+$/))
			throw new Error('Invalid email')

		return value
	},
})

const parseFileValue = (value: any) => {
	if (typeof value === 'string') return { _type: 'File', name: value }

	if (
		typeof value === 'object' &&
		value._type === 'File' &&
		typeof value.name === 'string'
	)
		return value

	throw new Error('Invalid file')
}

export const FileScalarType = new GraphQLScalarType({
	name: 'File',
	description: 'File scalar type',
	parseValue: parseFileValue,
	serialize: (value: any) => {
		if (typeof value === 'string') return value

		if (
			typeof value === 'object' &&
			value._type === 'File' &&
			value.name === 'string'
		)
			return value.name

		throw new Error('Invalid file')
	},
	parseLiteral: (ast: any) => {
		if (ast.kind === Kind.STRING) return parseFileValue(ast.value)

		if (ast.kind === Kind.OBJECT) {
			const type = ast.fields.find(
				(field: any) => field.name.value === '__type',
			)
			const name = ast.fields.find(
				(field: any) => field.name.value === 'name',
			)

			if (type?.value && name?.value)
				return parseFileValue({
					__type: type.value.value,
					name: name.value.value,
				})
		}

		throw new Error('Invalid file')
	},
})

export const AnyWhereInput = new GraphQLInputObjectType({
	name: 'AnyWhereInput',
	fields: {
		equalTo: { type: AnyScalarType },
		notEqualTo: { type: AnyScalarType },
	},
})

export const FileWhereInput = new GraphQLInputObjectType({
	name: 'FileWhereInput',
	fields: {
		equalTo: { type: FileScalarType },
		notEqualTo: { type: FileScalarType },
		in: { type: new GraphQLList(FileScalarType) },
		notInt: { type: new GraphQLList(FileScalarType) },
	},
})

export const ArrayWhereInput = new GraphQLInputObjectType({
	name: 'ArrayWhereInput',
	fields: {
		equalTo: { type: AnyScalarType },
		notEqualTo: { type: AnyScalarType },
		contains: { type: AnyScalarType },
		notContains: { type: AnyScalarType },
	},
})

export const DateWhereInput = new GraphQLInputObjectType({
	name: 'DateWhereInput',
	fields: {
		equalTo: { type: DateScalarType },
		notEqualTo: { type: DateScalarType },
		in: { type: new GraphQLList(DateScalarType) },
		notIn: { type: new GraphQLList(DateScalarType) },
		lessThan: { type: DateScalarType },
		lessThanOrEqualTo: { type: DateScalarType },
		greaterThan: { type: DateScalarType },
		greaterThanOrEqualTo: { type: DateScalarType },
	},
})

export const EmailWhereInput = new GraphQLInputObjectType({
	name: 'EmailWhereInput',
	fields: {
		equalTo: { type: EmailScalarType },
		notEqualTo: { type: EmailScalarType },
		in: { type: new GraphQLList(EmailScalarType) },
		notIn: { type: new GraphQLList(EmailScalarType) },
	},
})

export const IdWhereInput = new GraphQLInputObjectType({
	name: 'IdWhereInput',
	fields: {
		equalTo: { type: GraphQLString },
		notEqualTo: { type: GraphQLString },
		in: { type: new GraphQLList(GraphQLString) },
		notIn: { type: new GraphQLList(GraphQLString) },
	},
})

export const StringWhereInput = new GraphQLInputObjectType({
	name: 'StringWhereInput',
	fields: {
		equalTo: { type: GraphQLString },
		notEqualTo: { type: GraphQLString },
		in: { type: new GraphQLList(GraphQLString) },
		notIn: { type: new GraphQLList(GraphQLString) },
	},
})

export const IntWhereInput = new GraphQLInputObjectType({
	name: 'IntWhereInput',
	fields: {
		equalTo: { type: GraphQLInt },
		notEqualTo: { type: GraphQLInt },
		lessThan: { type: GraphQLInt },
		lessThanOrEqualTo: { type: GraphQLInt },
		greaterThan: { type: GraphQLInt },
		greaterThanOrEqualTo: { type: GraphQLInt },
		in: { type: new GraphQLList(GraphQLInt) },
		notIn: { type: new GraphQLList(GraphQLInt) },
	},
})

export const FloatWhereInput = new GraphQLInputObjectType({
	name: 'FloatWhereInput',
	fields: {
		equalTo: { type: GraphQLFloat },
		notEqualTo: { type: GraphQLFloat },
		lessThan: { type: GraphQLFloat },
		lessThanOrEqualTo: { type: GraphQLFloat },
		greaterThan: { type: GraphQLFloat },
		greaterThanOrEqualTo: { type: GraphQLFloat },
		in: { type: new GraphQLList(GraphQLFloat) },
		notIn: { type: new GraphQLList(GraphQLFloat) },
	},
})

export const BooleanWhereInput = new GraphQLInputObjectType({
	name: 'BooleanWhereInput',
	fields: {
		equalTo: { type: GraphQLBoolean },
		notEqualTo: { type: GraphQLBoolean },
		in: { type: new GraphQLList(GraphQLBoolean) },
		notIn: { type: new GraphQLList(GraphQLBoolean) },
	},
})
