import {
	GraphQLBoolean,
	GraphQLEnumType,
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
	GraphQLScalarType,
	GraphQLString,
	GraphQLType,
} from 'graphql'
import { Resolver, Schema, WibeTypes } from './Schema'
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

const templateTypeToGraphqlType: Record<any, GraphQLType> = {
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
}) => {
	return required ? new GraphQLNonNull(type) : type
}

// For the moment we not support array of array (for sql database it's tricky)
const getGraphqlTypeFromTemplate = ({
	wibeType,
	typeValue,
	scalars,
	enums,
}: {
	wibeType: WibeTypes
	typeValue?: WibeTypes
	scalars: GraphQLScalarType[]
	enums: GraphQLEnumType[]
}) => {
	if (wibeType === 'Array') {
		if (!typeValue) throw new Error('Type value not found')
		if (typeValue === 'Array')
			throw new Error('Array of array are not supported')

		return new GraphQLList(templateTypeToGraphqlType[typeValue])
	}

	// Here we create all custom scalars and all custom enum
	if (!Object.keys(templateTypeToGraphqlType).includes(wibeType)) {
		const scalarExist = scalars.find((scalar) => scalar.name === wibeType)
		if (scalarExist) return scalarExist

		const enumExist = enums.find((e) => e.name === wibeType)
		if (enumExist) return enumExist

		throw new Error(`${wibeType} not exist in schema`)
	}

	return templateTypeToGraphqlType[wibeType]
}

// This class is tested in e2e test in graphql folder
export class WibeGraphlQLSchema {
	private schemas: Schema
	private objects: GraphQLObjectType[]
	private customScalars: GraphQLScalarType[]
	private customEnums: GraphQLEnumType[]

	constructor(schemas: Schema) {
		this.schemas = schemas
		this.objects = []
		this.customScalars = []
		this.customEnums = []
	}

	createSchema() {
		if (!this.schemas) throw new Error('Schema not found')

		const scalars = this.createScalars()
		const enums = this.createEnums()
		const objects = this.createObjects()

		const queriesAndMutations = this.schemas.schema.class.reduce(
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
												currentField.type === 'Array' &&
												currentField.typeValue
													? currentField.typeValue
													: undefined,
											scalars: this.customScalars,
											enums: this.customEnums,
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
										scalars,
										enums,
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

				const object = objects.find((o) => o.name === className)
				if (!object) throw new Error(`Object ${className} not found`)

				// Queries
				const defaultQueries = this.createDefaultQueriesSchema({
					className,
					whereInputType,
					object,
				})
				const customQueries = this.createCustomResolvers({
					resolvers: current.resolvers?.queries || {},
				})

				// Mutations
				const customMutations = this.createCustomResolvers({
					resolvers: current.resolvers?.mutations || {},
				})
				const defaultMutations = this.createDefaultMutationsSchema({
					className,
					defaultInputType,
					whereInputType,
					object,
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

		this.customScalars = scalars

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

		this.customEnums = enums

		return enums
	}

	createObjects() {
		const objects = this.schemas.schema.class.map((wibeClass) => {
			const fields = wibeClass.fields
			const fieldsOfObjectKeys = Object.keys(fields)
			const className = wibeClass.name.replace(' ', '')

			const graphqlFields = fieldsOfObjectKeys.reduce(
				(acc, fieldName) => {
					const currentField = fields[fieldName]

					acc[fieldName] = {
						type: wrapGraphQLTypeIn({
							required: !!currentField.required,
							type: getGraphqlTypeFromTemplate({
								wibeType: currentField.type,
								typeValue:
									currentField.type === 'Array' &&
									currentField.typeValue
										? currentField.typeValue
										: undefined,
								scalars: this.customScalars,
								enums: this.customEnums,
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
		})

		return objects
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
									scalars: this.customScalars,
									enums: this.customEnums,
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
							scalars: this.customScalars,
							enums: this.customEnums,
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
