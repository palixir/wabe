import {
	GraphQLEnumType,
	GraphQLFieldConfig,
	GraphQLID,
	GraphQLInputObjectType,
	GraphQLInterfaceType,
	GraphQLList,
	GraphQLNonNull,
	GraphQLObjectType,
	GraphQLOutputType,
	GraphQLScalarType,
} from 'graphql'
import { ClassInterface, Resolver, Schema, TypeField } from './Schema'
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
	getOutputType,
	getWhereInputType,
	wrapGraphQLTypeIn,
} from './utils'

// This class is tested in e2e test in graphql folder
export class WibeGraphlQLSchema {
	private schemas: Schema

	constructor(schemas: Schema) {
		this.schemas = schemas
	}

	createSchema() {
		if (!this.schemas) throw new Error('Schema not found')

		const scalars = this.createScalars()
		const enums = this.createEnums()
		const objects = this.createObjects({ scalars, enums })

		const queriesAndMutations = this.schemas.schema.class.reduce(
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
				const customQueries = this.createCustomResolvers({
					resolvers: current.resolvers?.queries || {},
					scalars,
					enums,
				})

				// Mutations
				const customMutations = this.createCustomResolvers({
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

		return { ...queriesAndMutations, scalars, enums, objects }
	}

	createScalars() {
		const scalars =
			this.schemas.schema.scalars?.map(
				(scalar) =>
					new GraphQLScalarType({
						...scalar,
					}),
			) || []

		return scalars
	}

	createEnums() {
		const enums =
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
					name: wibeEnum.name,
					values,
				})
			}) || []

		return enums
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
		const { name, fields } = wibeClass

		const fieldsOfObjectKeys = Object.keys(fields)
		const className = name.replace(' ', '')

		const graphqlFields = fieldsOfObjectKeys.reduce(
			(acc, fieldName) => {
				const currentField = fields[fieldName]

				if (currentField.type === 'Object') {
					const object = this.createObject({
						wibeClass: currentField.object,
						scalars,
						enums,
					})
					if (!object)
						throw new Error(
							`Failed to create ${currentField.object.name}`,
						)

					acc[fieldName] = {
						type: object,
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
					}) as GraphQLInterfaceType,
				}

				return acc
			},
			{} as Record<string, GraphQLFieldConfig<any, any, any>>,
		)

		return new GraphQLObjectType({
			name: className,
			fields: () => ({
				id: { type: GraphQLID },
				...graphqlFields,
			}),
		})
	}

	createOutputObject({
		object,
		wibeClass,
	}: { object: GraphQLObjectType; wibeClass: ClassInterface }) {
		return new GraphQLObjectType({
			name: `${wibeClass.name}Output`,
			fields: () => ({
				// TODO: Pagination and information on request
				objects: { type: new GraphQLList(object) },
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

	createCustomResolvers({
		resolvers,
		scalars,
		enums,
	}: {
		resolvers: Record<string, Resolver>
		scalars: GraphQLScalarType[]
		enums: GraphQLEnumType[]
	}) {
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
								type: getGraphqlType({
									field: currentArgs[argKey] as TypeField,
									scalars,
									enums,
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
						type: getGraphqlType({
							field: currentQuery as TypeField,
							scalars,
							enums,
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
		allObjects,
	}: {
		className: string
		whereInputType: GraphQLInputObjectType
		object: GraphQLObjectType
		allObjects: GraphQLObjectType[]
	}) {
		return {
			[className.toLowerCase()]: {
				type: object,
				args: { id: { type: GraphQLID } },
				resolve: (root, args, ctx, info) =>
					queryForOneObject(root, args, ctx, info, className),
			},
			[`${className.toLowerCase()}s`]: {
				type: new GraphQLNonNull(getOutputType({ object, allObjects })),
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
		allObjects,
	}: {
		className: string
		defaultInputType: GraphQLInputObjectType
		whereInputType: GraphQLInputObjectType
		object: GraphQLObjectType
		allObjects: GraphQLObjectType[]
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
				type: new GraphQLNonNull(getOutputType({ object, allObjects })),
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
				type: new GraphQLNonNull(getOutputType({ object, allObjects })),
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
				type: new GraphQLNonNull(getOutputType({ object, allObjects })),
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
