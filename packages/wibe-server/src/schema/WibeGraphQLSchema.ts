import {
	GraphQLBoolean,
	GraphQLFieldConfig,
	GraphQLFloat,
	GraphQLID,
	GraphQLInputObjectType,
	GraphQLInt,
	GraphQLInterfaceType,
	GraphQLList,
	GraphQLNonNull,
	GraphQLObjectType,
	GraphQLOutputType,
	GraphQLString,
	GraphQLType,
} from 'graphql'
import {
	Resolver,
	Schema,
	SchemaFields,
	TypeField,
	TypeResolver,
	WibeSchemaType,
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
import { DateScalarType, getWhereInputFromType } from '../graphql'

const templateTypeToGraphqlType: Record<
	Exclude<WibeSchemaType, 'Array'>,
	GraphQLType
> = {
	String: GraphQLString,
	Int: GraphQLInt,
	Float: GraphQLFloat,
	Boolean: GraphQLBoolean,
	Date: DateScalarType,
}

const wrapGraphQLTypeIn = ({
	required,
	type,
}: {
	required: boolean
	type: GraphQLType
}) => (required ? new GraphQLNonNull(type) : type)

// For the moment we not support array of array (for sql database it's tricky)
const getGraphqlTypeFromTemplate = ({
	wibeType,
	typeValue,
}: {
	wibeType: WibeSchemaType
	typeValue?: WibeSchemaType
}) => {
	if (wibeType === WibeSchemaType.Array) {
		if (!typeValue) throw new Error('Type value not found')
		if (typeValue === WibeSchemaType.Array)
			throw new Error('Array of array are not supported')

		return new GraphQLList(templateTypeToGraphqlType[typeValue])
	}

	return templateTypeToGraphqlType[wibeType]
}

// This class is tested in e2e test in graphql folder
export class WibeGraphlQLSchema {
	private schemas: Schema

	constructor(schemas: Schema) {
		this.schemas = schemas
	}

	createSchema() {
		if (!this.schemas) throw new Error('Schema not found')

		const res = this.schemas.schema.reduce(
			(previous, current) => {
				const fields = current.fields

				const className = current.name.replace(' ', '')

				const fieldsOfObjectKeys = Object.keys(fields)

				const defaultInputType = new GraphQLInputObjectType({
					name: `${className}CreateInput`,
					fields: () => {
						return fieldsOfObjectKeys.reduce(
							(acc, fieldName) => {
								const currentField = fields[fieldName]

								acc[fieldName] = {
									type: wrapGraphQLTypeIn({
										required: !!currentField.required,
										type: getGraphqlTypeFromTemplate({
											wibeType: currentField.type,
											typeValue:
												currentField.type ===
													WibeSchemaType.Array &&
												currentField.typeValue
													? currentField.typeValue
													: undefined,
										}),
									}),
								}

								return acc
							},
							{} as Record<string, any>,
						)
					},
				})

				const whereInputType = new GraphQLInputObjectType({
					name: `${className}WhereInput`,
					fields: () => {
						const whereInputObject = fieldsOfObjectKeys.reduce(
							(acc, fieldName) => {
								const currentField = fields[fieldName]
								const typeOfObject = currentField.type

								acc[fieldName] = {
									type: getWhereInputFromType({
										wibeType: typeOfObject,
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
						}
					},
				})

				const object = this.createObjectSchema(className, fields)
				const defaultQueries = this.createDefaultQueriesSchema({
					className,
					whereInputType,
					object,
				})
				const customQueries = this.createCustomResolvers({
					resolvers: current.resolvers?.queries || {},
				})

				const customMutations = this.createCustomResolvers({
					resolvers: current.resolvers?.mutations || {},
				})

				const defaultMutations = this.createDefaultMutationsSchema({
					className,
					defaultInputType,
					whereInputType,
					object,
				})

				// TODO : Refactor to avoid O(n)² complexity
				return {
					queries: {
						...previous.queries,
						...defaultQueries,
						...customQueries,
					},
					mutations: {
						...previous.mutations,
						...defaultMutations,
						...customMutations,
					},
				}
			},
			{ queries: {}, mutations: {} } as {
				queries: Record<string, GraphQLFieldConfig<any, any, any>>
				mutations: Record<string, GraphQLFieldConfig<any, any, any>>
			},
		)

		return res
	}

	createObjectSchema(className: string, fieldsOfObject: SchemaFields) {
		const res = Object.keys(fieldsOfObject).reduce(
			(acc, fieldName) => {
				const currentField = fieldsOfObject[fieldName]

				acc[fieldName] = {
					type: wrapGraphQLTypeIn({
						required: !!currentField.required,
						type: getGraphqlTypeFromTemplate({
							wibeType: currentField.type,
							typeValue:
								currentField.type === WibeSchemaType.Array &&
								currentField.typeValue
									? currentField.typeValue
									: undefined,
						}),
					}) as GraphQLInterfaceType,
				}

				return acc
			},
			{} as Record<string, GraphQLFieldConfig<any, any, any>>,
		)

		return new GraphQLObjectType({
			name: className,
			fields: { id: { type: GraphQLID }, ...res },
		})
	}

	createCustomResolvers({
		resolvers,
	}: { resolvers: Record<string, Resolver> }) {
		const queriesKeys = Object.keys(resolvers)

		const res = queriesKeys.reduce(
			(acc, currentKey) => {
				const currentQuery = resolvers[currentKey]
				const required = !!currentQuery.required
				const currentArgs = currentQuery.args || {}
				const argsKeys = Object.keys(currentArgs)

				const args = argsKeys.reduce(
					(acc, argKey) => {
						acc[argKey] = {
							type: wrapGraphQLTypeIn({
								required: !!currentArgs[argKey].required,
								type: getGraphqlTypeFromTemplate({
									wibeType: currentArgs[argKey].type,
								}),
							}),
						}

						return acc
					},
					{} as Record<string, any>,
				)

				acc[currentKey] = {
					type: wrapGraphQLTypeIn({
						required,
						type: getGraphqlTypeFromTemplate({
							wibeType: currentQuery.type,
						}),
					}) as GraphQLOutputType,
					args,
					resolve: currentQuery.resolve,
				}

				return acc
			},
			{} as Record<string, GraphQLFieldConfig<any, any, any>>,
		)

		return res
	}

	createDefaultQueriesSchema({
		className,
		whereInputType,
		object,
	}: {
		className: string
		whereInputType: GraphQLInputObjectType
		object: GraphQLObjectType
	}) {
		return {
			[className.toLowerCase()]: {
				type: object,
				args: { id: { type: GraphQLID } },
				resolve: (root, args, ctx, info) =>
					queryForOneObject(root, args, ctx, info, className),
			},
			[`${className.toLowerCase()}s`]: {
				type: new GraphQLNonNull(new GraphQLList(object)),
				args: { where: { type: whereInputType } },
				resolve: (root, args, ctx, info) =>
					queryForMultipleObject(root, args, ctx, info, className),
			},
		} as Record<string, GraphQLFieldConfig<any, any, any>>
	}

	createDefaultMutationsSchema({
		className,
		object,
		defaultInputType,
		whereInputType,
	}: {
		className: string
		defaultInputType: GraphQLInputObjectType
		whereInputType: GraphQLInputObjectType
		object: GraphQLObjectType
	}) {
		const updateInputType = new GraphQLInputObjectType({
			name: `${className}UpdateInput`,
			fields: () => ({
				id: { type: GraphQLID },
				fields: { type: defaultInputType },
			}),
		})

		const updatesInputType = new GraphQLInputObjectType({
			name: `${className}sUpdateInput`,
			fields: () => ({
				fields: { type: defaultInputType },
				where: { type: whereInputType },
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

		const mutations: Record<string, GraphQLFieldConfig<any, any, any>> = {
			[`create${className}`]: {
				type: new GraphQLNonNull(object),
				args: { input: { type: defaultInputType } },
				resolve: (root, args, ctx, info) =>
					mutationToCreateObject(root, args, ctx, info, className),
			},
			[`create${className}s`]: {
				type: new GraphQLNonNull(new GraphQLList(object)),
				args: { input: { type: new GraphQLList(defaultInputType) } },
				resolve: (root, args, ctx, info) =>
					mutationToCreateMultipleObjects(
						root,
						args,
						ctx,
						info,
						className,
					),
			},
			[`update${className}`]: {
				type: new GraphQLNonNull(object),
				args: { input: { type: updateInputType } },
				resolve: (root, args, ctx, info) =>
					mutationToUpdateObject(root, args, ctx, info, className),
			},
			[`update${className}s`]: {
				type: new GraphQLNonNull(new GraphQLList(object)),
				args: { input: { type: updatesInputType } },
				resolve: (root, args, ctx, info) =>
					mutationToUpdateMultipleObjects(
						root,
						args,
						ctx,
						info,
						className,
					),
			},
			[`delete${className}`]: {
				type: new GraphQLNonNull(object),
				args: {
					input: {
						type: deleteInputType,
					},
				},
				resolve: (root, args, ctx, info) =>
					mutationToDeleteObject(root, args, ctx, info, className),
			},
			[`delete${className}s`]: {
				type: new GraphQLNonNull(new GraphQLList(object)),
				args: { input: { type: deletesInputType } },
				resolve: (root, args, ctx, info) =>
					mutationToDeleteMultipleObjects(
						root,
						args,
						ctx,
						info,
						className,
					),
			},
		}

		return mutations
	}
}
