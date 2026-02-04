import type { GraphQLSchema } from 'graphql'

export interface GraphqlSchemaOutput {
	input: Record<string, string>
	output?: string
}

const _getQueryFields = (name: string, schema: GraphQLSchema): GraphqlSchemaOutput => {
	const query = schema.getQueryType()?.getFields()[name]

	if (!query) throw new Error('Type not found in schema')

	const inputFields = query.args.reduce(
		(acc, arg) => ({ ...acc, [arg.name]: arg.type.toString() }),
		{},
	)

	const outputFields = query.type.toString()

	return {
		input: inputFields,
		output: outputFields,
	}
}

const _getMutationFields = (name: string, schema: GraphQLSchema): GraphqlSchemaOutput => {
	const mutation = schema.getMutationType()?.getFields()[name]

	if (!mutation) throw new Error('Type not found in schema')

	const inputFields = mutation.args.reduce(
		(acc, arg) => ({ ...acc, [arg.name]: arg.type.toString() }),
		{},
	)

	const outputFields = mutation.type.toString()

	return {
		input: inputFields,
		output: outputFields,
	}
}

const _getTypeFields = (name: string, schema: GraphQLSchema): GraphqlSchemaOutput => {
	const type = schema.getType(name)

	if (!type) throw new Error('Type not found in schema')

	// @ts-expect-error
	const fields = (type?.getFields?.() || {}) as Record<string, any>

	const formattedFields = Object.entries(fields).reduce(
		(acc, [fieldName, fieldType]) => ({
			...acc,
			[fieldName]: fieldType.type.toString(),
		}),
		{},
	)

	return {
		input: formattedFields,
	}
}

export const getTypeFromGraphQLSchema = ({
	type,
	name,
	schema,
}: {
	type: 'Type' | 'Query' | 'Mutation'
	name: string
	filter?: Array<string>
	schema: GraphQLSchema
}): GraphqlSchemaOutput => {
	switch (type) {
		case 'Query':
			return _getQueryFields(name, schema)
		case 'Mutation':
			return _getMutationFields(name, schema)
		case 'Type':
			return _getTypeFields(name, schema)
		default:
			throw new Error('Not implemented')
	}
}
