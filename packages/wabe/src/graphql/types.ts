import {
	GraphQLBoolean,
	GraphQLFloat,
	GraphQLInputObjectType,
	GraphQLInt,
	GraphQLList,
	GraphQLScalarType,
	GraphQLString,
	GraphQLID,
} from 'graphql'
import { isValidPhoneNumber } from 'libphonenumber-js'
import { tokenize } from '../utils'

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
	parseValue(value: any): Date {
		const date = new Date(value)

		if (Number.isNaN(date.getTime())) throw new Error('Invalid date')

		return date
	},
	serialize(value: any) {
		if (value instanceof Date) return value.toISOString()

		return new Date(value).toISOString()
	},
})

export const EmailScalarType = new GraphQLScalarType({
	name: 'Email',
	description: 'Email scalar type',
	parseValue(value: any): string {
		if (typeof value !== 'string') throw new Error('Invalid email')

		if (!value.match(/^[^@\s]+@[^@\s]+\.[^@\s]+$/)) throw new Error('Invalid email')

		return value
	},
})

export const PhoneScalarType = new GraphQLScalarType({
	name: 'Phone',
	description: 'Phone scalar type',
	parseValue(value: any): string {
		if (typeof value !== 'string') throw new Error('Invalid phone')

		if (!isValidPhoneNumber(value)) throw new Error('Invalid phone number')

		return value
	},
})

const parseFileValue = (value: any) => {
	if (value instanceof Blob) return value

	throw new Error('Invalid file')
}

export const FileScalarType = new GraphQLScalarType({
	name: 'File',
	description: 'File scalar type',
	parseValue: parseFileValue,
	serialize: (value: any) => {
		return value
	},
	parseLiteral: () => {
		throw new Error('Invalid file')
	},
})

export const SearchScalarType = new GraphQLScalarType({
	name: 'Search',
	description: 'Search scalar to tokenize and search for all searchable fields',
	parseValue: (value: any) => {
		if (typeof value !== 'string') throw new Error('Invalid search term')

		if (value === '') return ''

		return tokenize(value).split(' ')
	},
})

export const SearchWhereInput = new GraphQLInputObjectType({
	name: 'SearchWhereInput',
	fields: {
		contains: { type: SearchScalarType },
	},
})

export const AnyWhereInput = new GraphQLInputObjectType({
	name: 'AnyWhereInput',
	fields: {
		equalTo: { type: AnyScalarType },
		notEqualTo: { type: AnyScalarType },
		exists: { type: GraphQLBoolean },
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
		exists: { type: GraphQLBoolean },
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
		exists: { type: GraphQLBoolean },
	},
})

export const EmailWhereInput = new GraphQLInputObjectType({
	name: 'EmailWhereInput',
	fields: {
		equalTo: { type: EmailScalarType },
		notEqualTo: { type: EmailScalarType },
		in: { type: new GraphQLList(EmailScalarType) },
		notIn: { type: new GraphQLList(EmailScalarType) },
		exists: { type: GraphQLBoolean },
	},
})

export const PhoneWhereInput = new GraphQLInputObjectType({
	name: 'PhoneWhereInput',
	fields: {
		equalTo: { type: PhoneScalarType },
		notEqualTo: { type: PhoneScalarType },
		in: { type: new GraphQLList(PhoneScalarType) },
		notIn: { type: new GraphQLList(PhoneScalarType) },
		exists: { type: GraphQLBoolean },
	},
})

export const IdWhereInput = new GraphQLInputObjectType({
	name: 'IdWhereInput',
	fields: {
		equalTo: { type: GraphQLID },
		notEqualTo: { type: GraphQLID },
		in: { type: new GraphQLList(GraphQLID) },
		notIn: { type: new GraphQLList(GraphQLID) },
	},
})

export const StringWhereInput = new GraphQLInputObjectType({
	name: 'StringWhereInput',
	fields: {
		equalTo: { type: GraphQLString },
		notEqualTo: { type: GraphQLString },
		in: { type: new GraphQLList(GraphQLString) },
		notIn: { type: new GraphQLList(GraphQLString) },
		exists: { type: GraphQLBoolean },
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
		exists: { type: GraphQLBoolean },
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
		exists: { type: GraphQLBoolean },
	},
})

export const BooleanWhereInput = new GraphQLInputObjectType({
	name: 'BooleanWhereInput',
	fields: {
		equalTo: { type: GraphQLBoolean },
		notEqualTo: { type: GraphQLBoolean },
		in: { type: new GraphQLList(GraphQLBoolean) },
		notIn: { type: new GraphQLList(GraphQLBoolean) },
		exists: { type: GraphQLBoolean },
	},
})
