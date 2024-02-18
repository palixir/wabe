import {
	GraphQLEnumType,
	GraphQLFieldConfig,
	GraphQLID,
	GraphQLInputObjectType,
	GraphQLInt,
	GraphQLList,
	GraphQLNonNull,
	GraphQLObjectType,
	GraphQLScalarType,
} from 'graphql'
import { pluralize } from 'wibe-pluralize'
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
	ClassInterface,
	MutationResolver,
	QueryResolver,
	Schema,
	TypeField,
} from './Schema'
import {
	getGraphqlObjectFromWibeInputObject,
	getGraphqlObjectFromWibeWhereInputObject,
	getGraphqlObjectFromWibeUpdateInputObject,
	getGraphqlObjectFromWibeObject,
	getGraphqlType,
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
		const allObjects = this.createAllObjects({ scalars, enums })

		const queriesMutationAndObjects = this.schemas.schema.class.reduce(
			(acc, current) => {
				const className = current.name.replace(' ', '')

				const currentObject = allObjects.find(
					(object) => object[className] !== undefined,
				)
				if (!currentObject) throw new Error('Object not found')

				const {
					[className]: {
						object,
						inputObject: defaultInputType,
						updateInputObject: defaultUpdateInputType,
						whereInputObject: whereInputType,
						connectionObject,
					},
				} = currentObject

				// Queries
				const defaultQueries = this.createDefaultQueriesSchema({
					className,
					whereInputType,
					object,
					connectionObject,
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
					connectionObject,
					defaultUpdateInputType,
				})

				const defaultQueriesKeys = Object.keys(defaultQueries)
				const customQueriesKeys = Object.keys(customQueries)
				const defaultMutationsKeys = Object.keys(defaultMutations)
				const customMutationsKeys = Object.keys(customMutations)

				// Loop to avoid O(n)² complexity of spread on accumulator
				for (const key in defaultQueriesKeys) {
					acc.queries[defaultQueriesKeys[key]] =
						defaultQueries[defaultQueriesKeys[key]]
				}

				for (const key in customQueriesKeys) {
					acc.queries[customQueriesKeys[key]] =
						customQueries[customQueriesKeys[key]]
				}

				for (const key in defaultMutationsKeys) {
					acc.mutations[defaultMutationsKeys[key]] =
						defaultMutations[defaultMutationsKeys[key]]
				}

				for (const key in customMutationsKeys) {
					acc.mutations[customMutationsKeys[key]] =
						customMutations[customMutationsKeys[key]]
				}

				acc.objects.push(object)

				return acc
			},
			{ queries: {}, mutations: {}, objects: [] } as {
				queries: Record<string, GraphQLFieldConfig<any, any, any>>
				mutations: Record<string, GraphQLFieldConfig<any, any, any>>
				objects: Array<GraphQLObjectType>
			},
		)

		return {
			queries: queriesMutationAndObjects.queries,
			mutations: queriesMutationAndObjects.mutations,
			scalars,
			enums,
			objects: queriesMutationAndObjects.objects,
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

	createInputObject({
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

		const graphqlFields = getGraphqlObjectFromWibeInputObject({
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

		const inputObject = new GraphQLInputObjectType({
			name: `${nameWithoutSpace}Input`,
			description,
			fields: graphqlFieldsOfTheObject,
		})

		return inputObject
	}

	createUpdateInputObject({
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

		const graphqlFields = getGraphqlObjectFromWibeUpdateInputObject({
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

		const inputObject = new GraphQLInputObjectType({
			name: `${nameWithoutSpace}UpdateFieldsInput`,
			description,
			fields: graphqlFieldsOfTheObject,
		})

		return inputObject
	}

	createWhereInputObject({
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

		const graphqlFields = getGraphqlObjectFromWibeWhereInputObject({
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

		const inputObject = new GraphQLInputObjectType({
			name: `${nameWithoutSpace}WhereInput`,
			description,
			fields: () => ({
				...graphqlFieldsOfTheObject,
				...{
					OR: {
						type: new GraphQLList(inputObject),
					},
					AND: {
						type: new GraphQLList(inputObject),
					},
				},
			}),
		})

		return inputObject
	}

	createOutputObject({
		object,
		wibeClass,
	}: {
		object: GraphQLObjectType
		wibeClass: ClassInterface
	}) {
		const edgeObject = new GraphQLObjectType({
			name: `${wibeClass.name}Edge`,
			fields: () => ({
				node: { type: new GraphQLNonNull(object) },
			}),
		})

		const connectionObject = new GraphQLObjectType({
			name: `${wibeClass.name}Connection`,
			fields: () => ({
				edges: { type: new GraphQLList(edgeObject) },
			}),
		})

		return { edgeObject, connectionObject }
	}

	createAllObjects({
		scalars,
		enums,
	}: {
		scalars: GraphQLScalarType[]
		enums: GraphQLEnumType[]
	}) {
		return this.schemas.schema.class.map((wibeClass) => {
			const object = this.createObject({ scalars, enums, wibeClass })
			const { edgeObject, connectionObject } = this.createOutputObject({
				object,
				wibeClass,
			})
			const inputObject = this.createInputObject({
				scalars,
				enums,
				wibeClass,
			})
			const updateInputObject = this.createUpdateInputObject({
				scalars,
				enums,
				wibeClass,
			})
			const whereInputObject = this.createWhereInputObject({
				scalars,
				enums,
				wibeClass,
			})

			return {
				[wibeClass.name]: {
					object,
					edgeObject,
					connectionObject,
					inputObject,
					updateInputObject,
					whereInputObject,
				},
			}
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
		connectionObject,
	}: {
		className: string
		whereInputType: GraphQLInputObjectType
		object: GraphQLObjectType
		connectionObject: GraphQLObjectType
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
				type: new GraphQLNonNull(connectionObject),
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
		connectionObject,
	}: {
		className: string
		defaultInputType: GraphQLInputObjectType
		defaultUpdateInputType: GraphQLInputObjectType
		whereInputType: GraphQLInputObjectType
		object: GraphQLObjectType
		connectionObject: GraphQLObjectType
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
				type: new GraphQLNonNull(connectionObject),
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
				type: new GraphQLNonNull(connectionObject),
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
				type: new GraphQLNonNull(connectionObject),
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
