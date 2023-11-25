import {
	GraphQLBoolean,
	GraphQLFieldConfig,
	GraphQLFloat,
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

				const object = this.createObjectSchema(className, fields)
				const queries = this.createQueriesSchema(className, object)
				const mutations = this.createMutationsSchema(
					className,
					fields,
					object,
				)

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
			fields: res,
		})
	}

	createQueriesSchema(className: string, object: GraphQLObjectType) {
		const queries = {
			[className.toLowerCase()]: {
				type: new GraphQLNonNull(object),
				args: { id: { type: GraphQLString } },
				resolve: (root: any, args: any, ctx: any, info: any) =>
					queryForOneObject(root, args, ctx, info, className),
			},
			[`${className.toLowerCase()}s`]: {
				type: new GraphQLList(object),
				args: {},
				resolve: (root: any, args: any, ctx: any, info: any) =>
					queryForMultipleObject(root, args, ctx, info, className),
			},
		}

		return queries
	}

	createMutationsSchema(
		className: string,
		fieldsOfObject: SchemaFields,
		object: GraphQLObjectType,
	) {
		const fieldsOfObjectKeys = Object.keys(fieldsOfObject)

		const defaultInputType = new GraphQLInputObjectType({
			name: `${className}CreateInput`,
			fields: () =>
				fieldsOfObjectKeys.reduce((acc, fieldName) => {
					const typeOfObject = fieldsOfObject[fieldName].type

					return {
						...acc,
						[fieldName]: {
							type: templateTypeToGraphqlType[typeOfObject],
						},
					}
				}, {}),
		})

		const whereInputType = new GraphQLInputObjectType({
			name: `${className}WhereInput`,
			fields: () => {
				return fieldsOfObjectKeys.reduce((acc, fieldName) => {
					const typeOfObject = fieldsOfObject[fieldName].type

					return {
						...acc,
						[fieldName]: {
							type: getWhereInputFromType(typeOfObject),
						},
					}
				}, {})
			},
		})

		const updateInputType = new GraphQLInputObjectType({
			name: `${className}UpdateInput`,
			fields: () => ({
				id: { type: GraphQLString },
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
				id: { type: GraphQLString },
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
				resolve: (root: any, args: any, ctx: any, info: any) =>
					mutationToCreateObject(root, args, ctx, info, className),
			},
			[`create${className}s`]: {
				type: new GraphQLList(object),
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
				resolve: (root: any, args: any, ctx: any, info: any) => {},
			},
			[`update${className}s`]: {
				type: new GraphQLNonNull(new GraphQLList(object)),
				args: { input: { type: updatesInputType } },
				resolve: (root: any, args: any, ctx: any, info: any) => {},
			},
			[`delete${className}`]: {
				type: new GraphQLNonNull(object),
				args: {
					input: {
						type: deleteInputType,
					},
				},
				resolve: (root: any, args: any, ctx: any, info: any) => {},
			},
			[`delete${className}s`]: {
				type: new GraphQLNonNull(new GraphQLList(object)),
				args: { input: { type: deletesInputType } },
				resolve: (root: any, args: any, ctx: any, info: any) => {},
			},
		}

		return mutations
	}
}
