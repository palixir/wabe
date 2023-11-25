import {
	GraphQLBoolean,
	GraphQLFloat,
	GraphQLInputObjectType,
	GraphQLInt,
	GraphQLList,
	GraphQLString,
} from 'graphql'
import { WibeScalarType } from '../schema/Schema'

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
	},
})

const templateWhereInput: Record<WibeScalarType, GraphQLInputObjectType> = {
	[WibeScalarType.String]: StringWhereInput,
	[WibeScalarType.Int]: IntWhereInput,
	[WibeScalarType.Float]: FloatWhereInput,
	[WibeScalarType.Boolean]: BooleanWhereInput,
}

export const getWhereInputFromType = (type: WibeScalarType) =>
	templateWhereInput[type]
