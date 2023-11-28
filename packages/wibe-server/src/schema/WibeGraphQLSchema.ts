import {
	GraphQLBoolean,
	GraphQLFieldConfig,
	GraphQLFloat,
	GraphQLID,
	GraphQLInputObjectType,
	GraphQLInt,
	GraphQLList,
	GraphQLNonNull,
	GraphQLObjectType,
	GraphQLString,
	GraphQLType,
} from 'graphql'
import { Schema, SchemaFields, TypeField } from './Schema'
import {
	mutationToCreateMultipleObjects,
	mutationToCreateObject,
	mutationToUpdateMultipleObjects,
	mutationToUpdateObject,
	queryForMultipleObject,
	queryForOneObject,
} from './resolvers'
import { getWhereInputFromType } from '../graphql'

const templateTypeToGraphqlType: Record<TypeField['type'], GraphQLType> = {
	String: GraphQLString,
	Int: GraphQLInt,
	Float: GraphQLFloat,
	Boolean: GraphQLBoolean,
}

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
					fields: () =>
						fieldsOfObjectKeys.reduce((acc, fieldName) => {
							const typeOfObject = fields[fieldName].type

							return {
								...acc,
								[fieldName]: {
									type: templateTypeToGraphqlType[
										typeOfObject
									],
								},
							}
						}, {}),
				})

				const whereInputType = new GraphQLInputObjectType({
					name: `${className}WhereInput`,
					fields: () => {
						return fieldsOfObjectKeys.reduce((acc, fieldName) => {
							const typeOfObject = fields[fieldName].type

							return {
								...acc,
								[fieldName]: {
									type: getWhereInputFromType(typeOfObject),
								},
							}
						}, {})
					},
				})

				const object = this.createObjectSchema(className, fields)
				const queries = this.createQueriesSchema({
					className,
					whereInputType,
					object,
				})
				const mutations = this.createMutationsSchema({
					className,
					defaultInputType,
					whereInputType,
					object,
				})

				return {
					queries: { ...previous.queries, ...queries },
					mutations: { ...previous.mutations, ...mutations },
				}
			},
			{ queries: {}, mutations: {} } as {
				queries: any
				mutations: any
			},
		)

		return res
	}

	createObjectSchema(className: string, fieldsOfObject: SchemaFields) {
		const res = Object.keys(fieldsOfObject).reduce((acc, fieldName) => {
			const typeOfObject = fieldsOfObject[fieldName].type

			return {
				...acc,
				[fieldName]: {
					type: templateTypeToGraphqlType[typeOfObject],
				},
			}
		}, {})

		return new GraphQLObjectType({
			name: className,
			fields: { id: { type: GraphQLID }, ...res },
		})
	}

	createQueriesSchema({
		className,
		whereInputType,
		object,
	}: {
		className: string
		whereInputType: GraphQLInputObjectType
		object: GraphQLObjectType
	}) {
		const queries: Record<string, GraphQLFieldConfig<any, any, any>> = {
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
		}

		return queries
	}

	createMutationsSchema({
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
				resolve: (root, args, ctx, info) => {},
			},
			[`delete${className}s`]: {
				type: new GraphQLNonNull(new GraphQLList(object)),
				args: { input: { type: deletesInputType } },
				resolve: (root, args, ctx, info) => {},
			},
		}

		return mutations
	}
}
