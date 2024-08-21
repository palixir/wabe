import {
	GraphQLEnumType,
	type GraphQLFieldConfig,
	GraphQLID,
	GraphQLInputObjectType,
	GraphQLInt,
	GraphQLList,
	GraphQLNonNull,
	GraphQLObjectType,
	type GraphQLOutputType,
	GraphQLScalarType,
	GraphQLString,
} from 'graphql'
import { pluralize } from 'wibe-pluralize'
import type { WibeAppTypes } from '..'
import type {
	ClassInterface,
	MutationResolver,
	QueryResolver,
	Schema,
} from '../schema'
import { firstLetterInLowerCase } from '../utils'
import type { DevWibeAppTypes } from '../utils/helper'
import { GraphqlParser, type GraphqlParserFactory } from './parser'
import {
	mutationToCreateMultipleObjects,
	mutationToCreateObject,
	mutationToDeleteMultipleObjects,
	mutationToDeleteObject,
	mutationToUpdateMultipleObjects,
	mutationToUpdateObject,
	queryForMultipleObject,
	queryForOneObject,
} from './resolvers'
import { IdWhereInput } from './types'

type AllPossibleObject =
	| 'object'
	| 'inputObject'
	| 'whereInputObject'
	| 'connectionObject'
	| 'pointerInputObject'
	| 'relationInputObject'
	| 'updateInputObject'
	| 'createInputObject'

export type AllObjects = Record<string, Record<AllPossibleObject, any>>

export class GraphQLSchema {
	private schemas: Schema<DevWibeAppTypes>

	private allObjects: AllObjects

	constructor(schemas: Schema<any>) {
		this.schemas = schemas
		this.allObjects = {}
	}

	createSchema() {
		if (!this.schemas) throw new Error('Schema not found')

		const scalars = this.createScalars()
		const enums = this.createEnums()

		const classes = this.schemas.schema.classes

		const graphqlParser = GraphqlParser({ scalars, enums })

		classes.map((wibeClass) =>
			this.createCompleteObject(graphqlParser, wibeClass),
		)

		const queriesMutationAndObjects = classes.reduce(
			(acc, current) => {
				const className = current.name.replace(' ', '')

				const currentObject = this.allObjects[className]

				if (!currentObject) throw new Error('Object not found')

				const {
					object,
					inputObject,
					pointerInputObject,
					relationInputObject,
					createInputObject,
					updateInputObject,
					whereInputObject,
					connectionObject,
				} = currentObject

				// Queries
				const defaultQueries = this.createDefaultQueries({
					className,
					whereInputType: whereInputObject,
					object,
					connectionObject,
				})

				const defaultMutations = this.createDefaultMutations({
					className,
					whereInputType: whereInputObject,
					object,
					connectionObject,
					defaultUpdateInputType: updateInputObject,
					defaultCreateInputType: createInputObject,
				})

				const defaultQueriesKeys = Object.keys(defaultQueries)
				const defaultMutationsKeys = Object.keys(defaultMutations)

				// Loop to avoid O(n)² complexity of spread on accumulator
				for (const key in defaultQueriesKeys) {
					acc.queries[defaultQueriesKeys[key]] =
						defaultQueries[defaultQueriesKeys[key]]
				}

				for (const key in defaultMutationsKeys) {
					acc.mutations[defaultMutationsKeys[key]] =
						defaultMutations[defaultMutationsKeys[key]]
				}

				acc.objects.push(object)
				acc.objects.push(inputObject)
				acc.objects.push(pointerInputObject)
				acc.objects.push(relationInputObject)

				return acc
			},
			{ queries: {}, mutations: {}, objects: [] } as {
				queries: Record<string, GraphQLFieldConfig<any, any, any>>
				mutations: Record<string, GraphQLFieldConfig<any, any, any>>
				objects: Array<GraphQLObjectType | GraphQLInputObjectType>
			},
		)

		const customQueries = this.createCustomQueries({
			resolvers: this.schemas.schema.resolvers?.queries || {},
			graphqlParser,
		})
		const customQueriesKeys = Object.keys(customQueries)

		for (const key in customQueriesKeys) {
			queriesMutationAndObjects.queries[customQueriesKeys[key]] =
				customQueries[customQueriesKeys[key]]
		}

		// Mutations
		const customMutations = this.createCustomMutations({
			resolvers: this.schemas.schema.resolvers?.mutations || {},
			graphqlParser,
		})
		const customMutationsKeys = Object.keys(customMutations)

		for (const key in customMutationsKeys) {
			queriesMutationAndObjects.mutations[customMutationsKeys[key]] =
				customMutations[customMutationsKeys[key]]
		}

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
		graphqlParser,
	}: {
		wibeClass: ClassInterface<DevWibeAppTypes>
		graphqlParser: GraphqlParserFactory
	}) {
		const { name, fields, description } = wibeClass

		const nameWithoutSpace = name.replace(' ', '')

		const graphqlParserWithInput = graphqlParser({
			schemaFields: fields,
			graphqlObjectType: 'Object',
			allObjects: this.allObjects,
		})

		return new GraphQLObjectType({
			name: nameWithoutSpace,
			description,
			// We need to use function here to have lazy loading of fields
			fields: () => ({
				id: { type: new GraphQLNonNull(GraphQLID) },
				...graphqlParserWithInput.getGraphqlFields(nameWithoutSpace),
			}),
		})
	}

	createPointerInputObject({
		wibeClass,
		inputCreateFields,
	}: {
		wibeClass: ClassInterface<DevWibeAppTypes>
		inputCreateFields: GraphQLInputObjectType
	}) {
		const { name } = wibeClass

		const nameWithoutSpace = name.replace(' ', '')

		return new GraphQLInputObjectType({
			name: `${nameWithoutSpace}PointerInput`,
			description: `Input to link an object to a pointer ${nameWithoutSpace}`,
			fields: () => ({
				link: { type: GraphQLID },
				createAndLink: { type: inputCreateFields },
			}),
		})
	}

	createRelationInputObject({
		wibeClass,
		inputCreateFields,
	}: {
		wibeClass: ClassInterface<DevWibeAppTypes>
		inputCreateFields: GraphQLInputObjectType
	}) {
		const { name } = wibeClass

		const nameWithoutSpace = name.replace(' ', '')

		return new GraphQLInputObjectType({
			name: `${nameWithoutSpace}RelationInput`,
			description: `Input to add a relation to the class ${nameWithoutSpace}`,
			fields: () => ({
				add: { type: new GraphQLList(new GraphQLNonNull(GraphQLID)) },
				remove: {
					type: new GraphQLList(new GraphQLNonNull(GraphQLID)),
				},
				createAndAdd: {
					type: new GraphQLList(
						new GraphQLNonNull(inputCreateFields),
					),
				},
			}),
		})
	}

	createInputObject({
		wibeClass,
		graphqlParser,
	}: {
		wibeClass: ClassInterface<DevWibeAppTypes>
		graphqlParser: GraphqlParserFactory
	}) {
		const { name, fields, description } = wibeClass

		const nameWithoutSpace = name.replace(' ', '')

		const graphqlParserWithInput = graphqlParser({
			schemaFields: fields,
			graphqlObjectType: 'InputObject',
			allObjects: this.allObjects,
		})

		return new GraphQLInputObjectType({
			name: `${nameWithoutSpace}Input`,
			description,
			fields: () => ({
				...graphqlParserWithInput.getGraphqlFields(nameWithoutSpace),
			}),
		})
	}

	createCreateInputObject({
		wibeClass,
		graphqlParser,
	}: {
		wibeClass: ClassInterface<DevWibeAppTypes>
		graphqlParser: GraphqlParserFactory
	}) {
		const { name, fields, description } = wibeClass

		const nameWithoutSpace = name.replace(' ', '')

		const graphqlParserWithInput = graphqlParser({
			schemaFields: fields,
			graphqlObjectType: 'CreateFieldsInput',
			allObjects: this.allObjects,
		})

		return new GraphQLInputObjectType({
			name: `${nameWithoutSpace}CreateFieldsInput`,
			description,
			fields: () => ({
				...graphqlParserWithInput.getGraphqlFields(nameWithoutSpace),
			}),
		})
	}

	createUpdateInputObject({
		wibeClass,
		graphqlParser,
	}: {
		wibeClass: ClassInterface<DevWibeAppTypes>
		graphqlParser: GraphqlParserFactory
	}) {
		const { name, fields, description } = wibeClass

		const nameWithoutSpace = name.replace(' ', '')

		const graphqlParserWithInput = graphqlParser({
			schemaFields: fields,
			graphqlObjectType: 'UpdateFieldsInput',
			allObjects: this.allObjects,
		})

		return new GraphQLInputObjectType({
			name: `${nameWithoutSpace}UpdateFieldsInput`,
			description,
			fields: () => ({
				...graphqlParserWithInput.getGraphqlFields(nameWithoutSpace),
			}),
		})
	}

	createWhereInputObject({
		wibeClass,
		graphqlParser,
	}: {
		wibeClass: ClassInterface<DevWibeAppTypes>
		graphqlParser: GraphqlParserFactory
	}) {
		const { name, fields, description } = wibeClass

		const nameWithoutSpace = name.replace(' ', '')

		const graphqlParserWithInput = graphqlParser({
			schemaFields: fields,
			graphqlObjectType: 'WhereInputObject',
			allObjects: this.allObjects,
		})

		// @ts-expect-error
		const inputObject = new GraphQLInputObjectType({
			name: `${nameWithoutSpace}WhereInput`,
			description,
			fields: () => ({
				id: { type: IdWhereInput },
				...graphqlParserWithInput.getGraphqlFields(nameWithoutSpace),
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

	createConnectionObject({
		object,
		wibeClass,
	}: {
		object: GraphQLObjectType
		wibeClass: ClassInterface<DevWibeAppTypes>
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
				count: { type: GraphQLInt },
				edges: { type: new GraphQLList(edgeObject) },
			}),
		})

		return connectionObject
	}

	createCompleteObject(
		graphqlParser: GraphqlParserFactory,
		wibeClass: ClassInterface<DevWibeAppTypes>,
	) {
		const object = this.createObject({ graphqlParser, wibeClass })

		const connectionObject = this.createConnectionObject({
			object,
			wibeClass,
		})

		const inputObject = this.createInputObject({
			graphqlParser,
			wibeClass,
		})

		const createInputObject = this.createCreateInputObject({
			graphqlParser,
			wibeClass,
		})

		const pointerInputObject = this.createPointerInputObject({
			inputCreateFields: createInputObject,
			wibeClass,
		})

		const relationInputObject = this.createRelationInputObject({
			inputCreateFields: createInputObject,
			wibeClass,
		})

		const updateInputObject = this.createUpdateInputObject({
			graphqlParser,
			wibeClass,
		})

		const whereInputObject = this.createWhereInputObject({
			graphqlParser,
			wibeClass,
		})

		this.allObjects[wibeClass.name] = {
			connectionObject,
			createInputObject,
			updateInputObject,
			whereInputObject,
			pointerInputObject,
			relationInputObject,
			inputObject,
			object,
		}
	}

	createCustomMutations({
		resolvers,
		graphqlParser,
	}: {
		resolvers: Record<string, MutationResolver<DevWibeAppTypes>>
		graphqlParser: GraphqlParserFactory
	}) {
		return Object.keys(resolvers).reduce(
			(acc, currentKey) => {
				const currentMutation = resolvers[currentKey]
				const required = !!currentMutation.required
				const input = currentMutation.args?.input || {}
				const numberOfFieldsInInput = Object.keys(input).length

				const currentKeyWithFirstLetterUpperCase = `${currentKey[0].toUpperCase()}${currentKey.slice(
					1,
				)}`

				const graphqlParserWithInput = graphqlParser({
					schemaFields: input,
					graphqlObjectType: 'InputObject',
					allObjects: this.allObjects,
				})

				const getGraphqlOutputType = ():
					| GraphQLOutputType
					| undefined => {
					if (currentMutation.type !== 'Object')
						return graphqlParserWithInput.getGraphqlType({
							...currentMutation,
						})

					const objectGraphqlParser = graphqlParser({
						schemaFields: currentMutation.outputObject.fields,
						graphqlObjectType: 'Object',
						allObjects: this.allObjects,
					})

					return new GraphQLObjectType({
						name: currentMutation.outputObject.name,
						fields: () => ({
							...objectGraphqlParser.getGraphqlFields(
								currentMutation.outputObject.name,
							),
						}),
					})
				}

				const outputType = getGraphqlOutputType()

				if (!outputType) throw new Error('Invalid mutation output type')

				const graphqlInput = new GraphQLInputObjectType({
					name: `${currentKeyWithFirstLetterUpperCase}Input`,
					fields: graphqlParserWithInput.getGraphqlFields(
						currentKeyWithFirstLetterUpperCase,
					),
				})

				acc[currentKey] = {
					type: required
						? new GraphQLNonNull(outputType)
						: outputType,
					args:
						numberOfFieldsInInput > 0
							? { input: { type: graphqlInput } }
							: undefined,
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
		graphqlParser,
	}: {
		resolvers: Record<string, QueryResolver<DevWibeAppTypes>>
		graphqlParser: GraphqlParserFactory
	}) {
		return Object.keys(resolvers).reduce(
			(acc, currentKey) => {
				const currentQuery = resolvers[currentKey]
				const required = !!currentQuery.required
				const currentArgs = currentQuery.args || {}

				const graphqlParserWithInput = graphqlParser({
					schemaFields: currentArgs,
					graphqlObjectType: 'Object',
					allObjects: this.allObjects,
				})

				const getGraphqlOutputType = ():
					| GraphQLOutputType
					| undefined => {
					if (currentQuery.type !== 'Object')
						return graphqlParserWithInput.getGraphqlType({
							...currentQuery,
						})

					if (currentQuery.type === 'Object') {
						const objectGraphqlParser = graphqlParser({
							schemaFields: currentQuery.outputObject.fields,
							graphqlObjectType: 'Object',
							allObjects: this.allObjects,
						})

						return new GraphQLObjectType({
							name: currentQuery.outputObject.name,
							fields: () => ({
								...objectGraphqlParser.getGraphqlFields(
									currentQuery.outputObject.name,
								),
							}),
						})
					}
				}

				const outputType = getGraphqlOutputType()

				if (!outputType) throw new Error('Invalid mutation output type')

				acc[currentKey] = {
					type: required
						? new GraphQLNonNull(outputType)
						: outputType,
					args: graphqlParserWithInput.getGraphqlFields(currentKey),
					description: currentQuery.description,
					resolve: currentQuery.resolve,
				}

				return acc
			},
			{} as Record<string, GraphQLFieldConfig<any, any, any>>,
		)
	}

	createDefaultQueries({
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
		const classNameWithFirstLetterLowerCase =
			firstLetterInLowerCase(className)

		return {
			[classNameWithFirstLetterLowerCase]: {
				type: object,
				description: object.description,
				args: { id: { type: GraphQLID } },
				resolve: (root, args, ctx, info) =>
					queryForOneObject(root, args, ctx, info, className),
			},
			[pluralize(classNameWithFirstLetterLowerCase)]: {
				type: new GraphQLNonNull(connectionObject),
				description: object.description,
				args: {
					where: { type: whereInputType },
					offset: { type: GraphQLInt },
					first: { type: GraphQLInt },
					searchTerm: { type: GraphQLString },
				},
				resolve: (root, args, ctx, info) =>
					queryForMultipleObject(root, args, ctx, info, className),
			},
		} as Record<string, GraphQLFieldConfig<any, any, any>>
	}

	createDefaultMutations({
		className,
		object,
		defaultUpdateInputType,
		defaultCreateInputType,
		whereInputType,
		connectionObject,
	}: {
		className: string
		defaultUpdateInputType: GraphQLInputObjectType
		defaultCreateInputType: GraphQLInputObjectType
		whereInputType: GraphQLInputObjectType
		object: GraphQLObjectType
		connectionObject: GraphQLObjectType
	}) {
		const classNameWithFirstLetterLowerCase =
			firstLetterInLowerCase(className)

		const pluralClassName = pluralize(className)

		const createPayloadType = new GraphQLObjectType({
			name: `Create${className}Payload`,
			fields: () => ({
				[classNameWithFirstLetterLowerCase]: { type: object },
				clientMutationId: { type: GraphQLString },
			}),
		})

		const createInputType = new GraphQLInputObjectType({
			name: `Create${className}Input`,
			fields: () => ({
				fields: { type: defaultCreateInputType },
			}),
		})

		const createsInputType = new GraphQLInputObjectType({
			name: `Create${pluralClassName}Input`,
			fields: () => ({
				fields: {
					type: new GraphQLNonNull(
						new GraphQLList(defaultCreateInputType),
					),
				},
				offset: { type: GraphQLInt },
				first: { type: GraphQLInt },
			}),
		})

		const updatePayloadType = new GraphQLObjectType({
			name: `Update${className}Payload`,
			fields: () => ({
				[classNameWithFirstLetterLowerCase]: { type: object },
				clientMutationId: { type: GraphQLString },
			}),
		})

		const updateInputType = new GraphQLInputObjectType({
			name: `Update${className}Input`,
			fields: () => ({
				id: { type: GraphQLID },
				fields: { type: defaultUpdateInputType },
			}),
		})

		const updatesInputType = new GraphQLInputObjectType({
			name: `Update${pluralClassName}Input`,
			fields: () => ({
				fields: { type: defaultUpdateInputType },
				where: { type: whereInputType },
				offset: { type: GraphQLInt },
				first: { type: GraphQLInt },
			}),
		})

		const deletePayloadType = new GraphQLObjectType({
			name: `Delete${className}Payload`,
			fields: () => ({
				[classNameWithFirstLetterLowerCase]: { type: object },
				clientMutationId: { type: GraphQLString },
			}),
		})

		const deleteInputType = new GraphQLInputObjectType({
			name: `Delete${className}Input`,
			fields: () => ({
				id: { type: GraphQLID },
			}),
		})

		const deletesInputType = new GraphQLInputObjectType({
			name: `Delete${pluralClassName}Input`,
			fields: () => ({
				where: { type: whereInputType },
			}),
		})

		return {
			[`create${className}`]: {
				type: createPayloadType,
				description: object.description,
				args: { input: { type: createInputType } },
				resolve: (root, args, ctx, info) =>
					mutationToCreateObject(
						root,
						args,
						ctx,
						info,
						className as keyof WibeAppTypes['types'],
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
						className as keyof WibeAppTypes['types'],
					),
			},
			[`update${className}`]: {
				type: updatePayloadType,
				description: object.description,
				args: { input: { type: updateInputType } },
				resolve: (root, args, ctx, info) =>
					mutationToUpdateObject(
						root,
						args,
						ctx,
						info,
						className as keyof WibeAppTypes['types'],
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
						className as keyof WibeAppTypes['types'],
					),
			},
			[`delete${className}`]: {
				type: deletePayloadType,
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
						className as keyof WibeAppTypes['types'],
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
						className as keyof WibeAppTypes['types'],
					),
			},
		} as Record<string, GraphQLFieldConfig<any, any, any>>
	}
}
