import { pluralize } from 'wibe-pluralize'
import {
	GraphQLEnumType,
	GraphQLFieldConfig,
	GraphQLID,
	GraphQLInputObjectType,
	GraphQLInt,
	GraphQLInterfaceType,
	GraphQLList,
	GraphQLNonNull,
	GraphQLObjectType,
	GraphQLOutputType,
	GraphQLScalarType,
} from 'graphql'
import {
	ClassInterface,
	MutationResolver,
	QueryResolver,
	Schema,
	TypeField,
} from './Schema'
import {
	mutationToCreateMultipleObjects,
	mutationToCreateObject,
	mutationToDeleteMultipleObjects,
	mutationToDeleteObject,
	mutationToUpdateMultipleObjects,
	mutationToUpdateObject,
	queryForMultipleObject,
	queryForOneObject,
} from '../graphql'
import {
	getDefaultInputType,
	getGraphqlType,
	getConnectionType,
	getUpdateInputType,
	getWhereInputType,
	wrapGraphQLTypeIn,
	parseWibeObject,
	getGraphqlObjectFromWibeObject,
} from './utils'

// This class is tested in e2e test in graphql folder
export class WibeGraphQLSchema {
	private schemas: Schema

	constructor(schemas: Schema) {
		this.schemas = schemas
	}

	createSchema() {
		if (!this.schemas) throw new Error('Schema not found')

		const scalars = this.createScalars()
		const enums = this.createEnums()
		const objects = this.createObjects({ scalars, enums })

		const queriesAndMutationsAndInput = this.schemas.schema.class.reduce(
			(previous, current) => {
				const fields = current.fields
				const className = current.name.replace(' ', '')
				const fieldsOfObjectKeys = Object.keys(fields)

				const defaultInputType = getDefaultInputType({
					fields,
					fieldsOfObjectKeys,
					objects,
					scalars,
					enums,
					className,
				})

				const defaultUpdateInputType = getUpdateInputType({
					fields,
					fieldsOfObjectKeys,
					objects,
					scalars,
					enums,
					className,
				})

				const whereInputType = getWhereInputType({
					fields,
					fieldsOfObjectKeys,
					objects,
					scalars,
					enums,
					className,
				})

				const object = objects.find((o) => o.name === className)
				if (!object) throw new Error(`Object ${className} not found`)

				// Queries
				const defaultQueries = this.createDefaultQueriesSchema({
					className,
					whereInputType,
					object,
					allObjects: objects,
				})
				const customQueries = this.createCustomQueries({
					resolvers: current.resolvers?.queries || {},
					scalars,
					enums,
				})

				// Mutations
				const customMutations = this.createCustomMutations({
					resolvers: current.resolvers?.mutations || {},
					scalars,
					enums,
				})
				const defaultMutations = this.createDefaultMutationsSchema({
					className,
					defaultInputType,
					whereInputType,
					object,
					allObjects: objects,
					defaultUpdateInputType,
				})

				const defaultQueriesKeys = Object.keys(defaultQueries)
				const customQueriesKeys = Object.keys(customQueries)
				const defaultMutationsKeys = Object.keys(defaultMutations)
				const customMutationsKeys = Object.keys(customMutations)

				// Loop to avoid O(n)² complexity of spread on accumulator
				for (const key in defaultQueriesKeys) {
					previous.queries[defaultQueriesKeys[key]] =
						defaultQueries[defaultQueriesKeys[key]]
				}

				for (const key in customQueriesKeys) {
					previous.queries[customQueriesKeys[key]] =
						customQueries[customQueriesKeys[key]]
				}

				for (const key in defaultMutationsKeys) {
					previous.mutations[defaultMutationsKeys[key]] =
						defaultMutations[defaultMutationsKeys[key]]
				}

				for (const key in customMutationsKeys) {
					previous.mutations[customMutationsKeys[key]] =
						customMutations[customMutationsKeys[key]]
				}

				return previous
			},
			{ queries: {}, mutations: {} } as {
				queries: Record<string, GraphQLFieldConfig<any, any, any>>
				mutations: Record<string, GraphQLFieldConfig<any, any, any>>
			},
		)

		return {
			...queriesAndMutationsAndInput,
			scalars,
			enums,
			objects,
		}
	}

	createScalars() {
		return (
			this.schemas.schema.scalars?.map(
				(scalar) =>
					new GraphQLScalarType({
						...scalar,
					}),
			) || []
		)
	}

	createEnums() {
		return (
			this.schemas.schema.enums?.map((wibeEnum) => {
				const enumValues = wibeEnum.values

				const values = Object.keys(enumValues).reduce(
					(acc, value) => {
						acc[value] = { value: enumValues[value] }

						return acc
					},
					{} as Record<string, any>,
				)

				return new GraphQLEnumType({
					...wibeEnum,
					values,
				})
			}) || []
		)
	}

	createObject({
		wibeClass,
		scalars,
		enums,
	}: {
		wibeClass: ClassInterface
		scalars: GraphQLScalarType[]
		enums: GraphQLEnumType[]
	}) {
		const { name, fields, description } = wibeClass

		const nameWithoutSpace = name.replace(' ', '')

		const graphqlFields = getGraphqlObjectFromWibeObject({
			scalars,
			enums,
			object: fields,
		})

		const fieldsKey = Object.keys(graphqlFields)

		const graphqlFieldsOfTheObject = fieldsKey.reduce(
			(acc, key) => {
				const field = graphqlFields[key]

				acc[key] = field

				return acc
			},
			{} as Record<string, GraphQLFieldConfig<any, any, any>>,
		)

		return new GraphQLObjectType({
			name: nameWithoutSpace,
			description,
			fields: () => ({
				id: { type: new GraphQLNonNull(GraphQLID) },
				...graphqlFieldsOfTheObject,
			}),
		})
	}

	createOutputObject({
		object,
		wibeClass,
	}: {
		object: GraphQLObjectType
		wibeClass: ClassInterface
	}) {
		const edges = new GraphQLObjectType({
			name: `${wibeClass.name}Edge`,
			fields: () => ({
				node: { type: new GraphQLNonNull(object) },
			}),
		})

		return new GraphQLObjectType({
			name: `${wibeClass.name}Connection`,
			fields: () => ({
				edges: { type: new GraphQLList(edges) },
			}),
		})
	}

	createObjects({
		scalars,
		enums,
	}: {
		scalars: GraphQLScalarType[]
		enums: GraphQLEnumType[]
	}) {
		return this.schemas.schema.class.flatMap((wibeClass) => {
			const object = this.createObject({ scalars, enums, wibeClass })
			const outputObject = this.createOutputObject({ object, wibeClass })

			return [object, outputObject]
		})
	}

	createCustomMutations({
		resolvers,
		scalars,
		enums,
	}: {
		resolvers: Record<string, MutationResolver>
		scalars: GraphQLScalarType[]
		enums: GraphQLEnumType[]
	}) {
		return Object.keys(resolvers).reduce(
			(acc, currentKey) => {
				const currentMutation = resolvers[currentKey]
				const required = !!currentMutation.required
				const input = currentMutation.args?.input || {}

				const currentKeyWithFirstLetterUpperCase = `${currentKey[0].toUpperCase()}${currentKey.slice(
					1,
				)}`

				const graphqlInputFields = getGraphqlObjectFromWibeObject({
					enums,
					scalars,
					object: input,
				})

				const graphqlInput = new GraphQLInputObjectType({
					name: `${currentKeyWithFirstLetterUpperCase}Input`,
					fields: graphqlInputFields,
				})

				const graphqlType = getGraphqlType({
					field: currentMutation as TypeField,
					scalars,
					enums,
				})

				acc[currentKey] = {
					type: required
						? new GraphQLNonNull(graphqlType)
						: graphqlType,
					args: { input: { type: graphqlInput } },
					description: currentMutation.description,
					resolve: currentMutation.resolve,
				}

				return acc
			},
			{} as Record<string, GraphQLFieldConfig<any, any, any>>,
		)
	}

	createCustomQueries({
		resolvers,
		scalars,
		enums,
	}: {
		resolvers: Record<string, QueryResolver>
		scalars: GraphQLScalarType[]
		enums: GraphQLEnumType[]
	}) {
		return Object.keys(resolvers).reduce(
			(acc, currentKey) => {
				const currentQuery = resolvers[currentKey]
				const required = !!currentQuery.required
				const currentArgs = currentQuery.args || {}

				const graphqlArgs = getGraphqlObjectFromWibeObject({
					enums,
					scalars,
					object: currentArgs,
				})

				const graphqlType = getGraphqlType({
					field: currentQuery as TypeField,
					scalars,
					enums,
				})

				acc[currentKey] = {
					type: required
						? new GraphQLNonNull(graphqlType)
						: graphqlType,
					args: graphqlArgs,
					description: currentQuery.description,
					resolve: currentQuery.resolve,
				}

				return acc
			},
			{} as Record<string, GraphQLFieldConfig<any, any, any>>,
		)
	}

	createDefaultQueriesSchema({
		className,
		whereInputType,
		object,
		allObjects,
	}: {
		className: string
		whereInputType: GraphQLInputObjectType
		object: GraphQLObjectType
		allObjects: GraphQLObjectType[]
	}) {
		const classNameInLowerCase = className.toLowerCase()
		return {
			[classNameInLowerCase]: {
				type: object,
				description: object.description,
				args: { id: { type: GraphQLID } },
				resolve: (root, args, ctx, info) =>
					queryForOneObject(
						root,
						args,
						ctx,
						info,
						className as keyof WibeSchemaTypes,
					),
			},
			[pluralize(classNameInLowerCase)]: {
				type: new GraphQLNonNull(
					getConnectionType({ object, allObjects }),
				),
				description: object.description,
				args: {
					where: { type: whereInputType },
					offset: { type: GraphQLInt },
					limit: { type: GraphQLInt },
				},
				resolve: (root, args, ctx, info) =>
					queryForMultipleObject(
						root,
						args,
						ctx,
						info,
						className as keyof WibeSchemaTypes,
					),
			},
		} as Record<string, GraphQLFieldConfig<any, any, any>>
	}

	createDefaultMutationsSchema({
		className,
		object,
		defaultInputType,
		defaultUpdateInputType,
		whereInputType,
		allObjects,
	}: {
		className: string
		defaultInputType: GraphQLInputObjectType
		defaultUpdateInputType: GraphQLInputObjectType
		whereInputType: GraphQLInputObjectType
		object: GraphQLObjectType
		allObjects: GraphQLObjectType[]
	}) {
		const createInputType = new GraphQLInputObjectType({
			name: `${className}CreateInput`,
			fields: () => ({
				fields: { type: defaultInputType },
			}),
		})

		const createsInputType = new GraphQLInputObjectType({
			name: `${className}sCreateInput`,
			fields: () => ({
				fields: {
					type: new GraphQLNonNull(new GraphQLList(defaultInputType)),
				},
				offset: { type: GraphQLInt },
				limit: { type: GraphQLInt },
			}),
		})

		const updateInputType = new GraphQLInputObjectType({
			name: `${className}UpdateInput`,
			fields: () => ({
				id: { type: GraphQLID },
				fields: { type: defaultUpdateInputType },
			}),
		})

		const updatesInputType = new GraphQLInputObjectType({
			name: `${className}sUpdateInput`,
			fields: () => ({
				fields: { type: defaultUpdateInputType },
				where: { type: whereInputType },
				offset: { type: GraphQLInt },
				limit: { type: GraphQLInt },
			}),
		})

		const deleteInputType = new GraphQLInputObjectType({
			name: `${className}DeleteInput`,
			fields: () => ({
				id: { type: GraphQLID },
			}),
		})

		const deletesInputType = new GraphQLInputObjectType({
			name: `${className}sDeleteInput`,
			fields: () => ({
				where: { type: whereInputType },
			}),
		})

		return {
			[`create${className}`]: {
				type: new GraphQLNonNull(object),
				description: object.description,
				args: { input: { type: createInputType } },
				resolve: (root, args, ctx, info) =>
					mutationToCreateObject(
						root,
						args,
						ctx,
						info,
						className as keyof WibeSchemaTypes,
					),
			},
			[`create${pluralize(className)}`]: {
				type: new GraphQLNonNull(
					getConnectionType({ object, allObjects }),
				),
				description: object.description,
				args: { input: { type: createsInputType } },
				resolve: (root, args, ctx, info) =>
					mutationToCreateMultipleObjects(
						root,
						args,
						ctx,
						info,
						className as keyof WibeSchemaTypes,
					),
			},
			[`update${className}`]: {
				type: new GraphQLNonNull(object),
				description: object.description,
				args: { input: { type: updateInputType } },
				resolve: (root, args, ctx, info) =>
					mutationToUpdateObject(
						root,
						args,
						ctx,
						info,
						className as keyof WibeSchemaTypes,
					),
			},
			[`update${pluralize(className)}`]: {
				type: new GraphQLNonNull(
					getConnectionType({ object, allObjects }),
				),
				description: object.description,
				args: { input: { type: updatesInputType } },
				resolve: (root, args, ctx, info) =>
					mutationToUpdateMultipleObjects(
						root,
						args,
						ctx,
						info,
						className as keyof WibeSchemaTypes,
					),
			},
			[`delete${className}`]: {
				type: new GraphQLNonNull(object),
				description: object.description,
				args: {
					input: {
						type: deleteInputType,
					},
				},
				resolve: (root, args, ctx, info) =>
					mutationToDeleteObject(
						root,
						args,
						ctx,
						info,
						className as keyof WibeSchemaTypes,
					),
			},
			[`delete${pluralize(className)}`]: {
				type: new GraphQLNonNull(
					getConnectionType({ object, allObjects }),
				),
				description: object.description,
				args: { input: { type: deletesInputType } },
				resolve: (root, args, ctx, info) =>
					mutationToDeleteMultipleObjects(
						root,
						args,
						ctx,
						info,
						className as keyof WibeSchemaTypes,
					),
			},
		} as Record<string, GraphQLFieldConfig<any, any, any>>
	}
}
