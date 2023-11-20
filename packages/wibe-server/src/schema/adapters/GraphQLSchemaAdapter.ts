import { Schema } from '../Schema'
import { SchemaFields, TypeField } from '../interface'
import { getWhereInputFromType } from '../../graphql'
import { SchemaRouterAdapter } from './adaptersInterface'
import {
	mutationToCreateMultipleObjects,
	mutationToCreateObject,
	queryForMultipleObject,
	queryForOneObject,
} from './resolvers'
import {
	GraphQLBoolean,
	GraphQLFloat,
	GraphQLInt,
	GraphQLObjectType,
	GraphQLString,
} from 'graphql'

export class GraphQLSchemaAdapter implements SchemaRouterAdapter {
	private schema: Schema[]

	constructor(schema: Schema[]) {
		this.schema = schema
	}

	_getGraphqlTypeFromType(type: TypeField['type']) {
		switch (type) {
			case 'String':
				return GraphQLString
			case 'Int':
				return GraphQLInt
			case 'Float':
				return GraphQLFloat
			case 'Boolean':
				return GraphQLBoolean
		}
	}

	createObjectSchema(className: string, fieldsOfObject: SchemaFields) {
		const res = Object.keys(fieldsOfObject).reduce((acc, fieldName) => {
			const typeOfObject = fieldsOfObject[fieldName].type

			if (typeOfObject !== 'array')
				return {
					...acc,
					[fieldName]: {
						type: this._getGraphqlTypeFromType(typeOfObject),
					},
				}

			return { ...acc }
		}, {})

		const object = new GraphQLObjectType({
			name: className,
			fields: res,
		})

		return object
	}

	createQueriesSchema(className: string) {
		// const queries = Graphql({
		// 	type: 'Query',
		// 	definition: (t) => {
		// 		// Query for one object (for example : user)
		// 		t.field(className.toLowerCase(), {
		// 			type: className,
		// 			args: { id: nonNull('String') },
		// 			resolve: (root, args, ctx, info) =>
		// 				queryForOneObject(root, args, ctx, info, className),
		// 		})
		// 		// Query for multiple objects (for example : users)
		// 		t.field(`${className.toLowerCase()}s`, {
		// 			type: list(className),
		// 			resolve: (root, args, ctx, info) =>
		// 				queryForMultipleObject(
		// 					root,
		// 					args,
		// 					ctx,
		// 					info,
		// 					className,
		// 				),
		// 		})
		// 	},
		// })
		// return queries

		const queries = new GraphQLObjectType({
			name: 'Query',
			fields: () => ({
				[className.toLowerCase()]: {
					type: GraphQLString,
					args: { id: { type: GraphQLString } },
					resolve: () =>
						'queryForOneObject(root, args, ctx, info, className)',
				},
				// [`${className.toLowerCase()}s`]: {
				// 	type: new GraphQLObjectType({
				// 		name: `${className}List`,
				// 		fields: {
				// 			[`${className.toLowerCase()}s`]: {
				// 				type: className,
				// 			},

				// 		},
				// 	}),
				// 	args: {

				// 	},
				// 	resolve: (root, args, ctx, info) =>
				// 		queryForMultipleObject(
				// 			root,
				// 			args,
				// 			ctx,
				// 			info,
				// 			className,
				// 		),
				// },
			}),
		})

		return queries
	}

	createMutationsSchema(className: string, fieldsOfObject: SchemaFields) {
		// user => User
		// const classNameFormat = `${className[0].toUpperCase()}${className.slice(
		// 	1,
		// )}`
		// const defaultTypeInput = inputObjectType({
		// 	name: `${classNameFormat}Input`,
		// 	definition: (t) => {
		// 		Object.keys(fieldsOfObject).map((fieldName) => {
		// 			const typeOfObject = fieldsOfObject[fieldName].type
		// 			if (typeOfObject !== 'array')
		// 				t.field(fieldName, {
		// 					type: typeOfObject,
		// 				})
		// 		})
		// 	},
		// })
		// const typeUpdateInput = inputObjectType({
		// 	name: `Update${classNameFormat}Input`,
		// 	definition: (t) => {
		// 		t.nonNull.id('id')
		// 		t.field('fields', { type: defaultTypeInput })
		// 	},
		// })
		// const typeUpdatesInput = inputObjectType({
		// 	name: `Update${classNameFormat}sInput`,
		// 	definition: (t) => {
		// 		t.field('fields', { type: defaultTypeInput })
		// 		t.field('where', { type: typeWhereInput })
		// 	},
		// })
		// const typeWhereInput = inputObjectType({
		// 	name: `Where${className}Input`,
		// 	definition: (t) => {
		// 		Object.keys(fieldsOfObject).map((fieldName) => {
		// 			const fieldObject = fieldsOfObject[fieldName]
		// 			t.field(fieldName, {
		// 				type: getWhereInputFromType({
		// 					valueArrayType:
		// 						fieldObject.type === 'array'
		// 							? fieldObject.valueType
		// 							: undefined,
		// 					typeField: fieldObject,
		// 					name: `${fieldName[0].toUpperCase()}${fieldName.slice(
		// 						1,
		// 					)}`,
		// 				}),
		// 			})
		// 		})
		// 	},
		// })
		// const mutations = extendType({
		// 	type: 'Mutation',
		// 	definition: (t) => {
		// 		// createUser
		// 		t.field(`create${classNameFormat}`, {
		// 			type: className,
		// 			args: { input: arg({ type: defaultTypeInput }) },
		// 			resolve: (root, args, ctx, info) =>
		// 				mutationToCreateObject(
		// 					root,
		// 					args,
		// 					ctx,
		// 					info,
		// 					className,
		// 				),
		// 		})
		// 		// createUsers
		// 		t.field(`create${classNameFormat}s`, {
		// 			type: list(className),
		// 			args: { input: list(arg({ type: defaultTypeInput })) },
		// 			resolve: (root, args, ctx, info) =>
		// 				mutationToCreateMultipleObjects(
		// 					root,
		// 					args,
		// 					ctx,
		// 					info,
		// 					className,
		// 				),
		// 		})
		// 		// updateUser
		// 		t.field(`update${classNameFormat}`, {
		// 			type: className,
		// 			args: {
		// 				input: arg({ type: typeUpdateInput }),
		// 			},
		// 			resolve: (root, args) => {},
		// 		})
		// 		// updateUsers
		// 		t.field(`update${classNameFormat}s`, {
		// 			type: list(className),
		// 			args: {
		// 				input: arg({ type: typeUpdatesInput }),
		// 			},
		// 			resolve: (root, args) => {},
		// 		})
		// 		// deleteUser
		// 		t.field(`delete${classNameFormat}`, {
		// 			type: className,
		// 			args: {
		// 				input: arg({
		// 					type: inputObjectType({
		// 						name: `Delete${classNameFormat}Input`,
		// 						definition: (t) => {
		// 							t.nonNull.id('id')
		// 						},
		// 					}),
		// 				}),
		// 			},
		// 			resolve: (root, args) => {},
		// 		})
		// 		// deleteUsers
		// 		t.field(`delete${classNameFormat}s`, {
		// 			type: list(className),
		// 			args: {
		// 				where: arg({ type: typeWhereInput }),
		// 			},
		// 			resolve: (root, args) => {},
		// 		})
		// 	},
		// })
		// return mutations
	}

	createSchema() {
		if (!this.schema) throw new Error('Schema not found')

		const arrayOfType = this.schema
			.map((schema) => {
				const fields = schema.getFields()

				const className = schema.getName().replace(' ', '')

				const object = this.createObjectSchema(className, fields)
				const queries = this.createQueriesSchema(className)
				const mutations = this.createMutationsSchema(className, fields)

				return { object, queries, mutations }
			})
			.flat()

		return {
			object: arrayOfType.map((type) => type.object),
			queries: arrayOfType.map((type) => type.queries),
		}
	}

	// createSchema(databaseController: DatabaseController) {
	// 	if (!this.schema) throw new Error('Schema not found')

	// 	const arrayOfType = this.schema
	// 		.map((schema) => {
	// 			const fields = schema.getFields()
	// 			const name = schema.getName().replace(' ', '')

	// 			const nameWithFirstLetterLowerCase =
	// 				`${name[0].toLowerCase()}${name.slice(
	// 					1,
	// 				)}` as keyof NexusGenFieldTypes

	// 			const nameWithFirstLetterUpperCase =
	// 				`${name[0].toUpperCase()}${name.slice(
	// 					1,
	// 				)}` as keyof NexusGenFieldTypes

	// 			const fieldsKeys = Object.keys(fields)

	// 			const object = objectType({
	// 				name: nameWithFirstLetterUpperCase,
	// 				definition: (t) => {
	// 					this._getTypesFromFields({
	// 						fields,
	// 						fieldsKeys,
	// 						t,
	// 						className: nameWithFirstLetterUpperCase,
	// 					})
	// 				},
	// 			})

	// 			const queries = extendType({
	// 				type: 'Query',
	// 				definition: (t) => {
	// 					t.field(nameWithFirstLetterLowerCase, {
	// 						type: nameWithFirstLetterUpperCase,
	// 						args: { id: nonNull('String') },
	// 						resolve: async (_, { id }, __, info) => {
	// 							const fields = getFieldsFromInfo(info)

	// 							if (!fields)
	// 								throw new Error('No fields provided')

	// 							return databaseController.getObject<any>({
	// 								className: nameWithFirstLetterUpperCase,
	// 								id,
	// 								fields,
	// 							})
	// 						},
	// 					})

	// 					t.list.field(`${nameWithFirstLetterLowerCase}s`, {
	// 						type: nameWithFirstLetterUpperCase,
	// 						resolve: (root, args, ctx, info) => {
	// 							const fields = getFieldsFromInfo(info)

	// 							if (!fields)
	// 								throw new Error('No fields provided')

	// 							return databaseController.getObjects<any>({
	// 								className: nameWithFirstLetterUpperCase,
	// 								fields,
	// 							})
	// 						},
	// 					})
	// 				},
	// 			})

	// 			const typeInput = inputObjectType({
	// 				name: `${nameWithFirstLetterUpperCase}Input`,
	// 				definition: (t) => {
	// 					this._getTypesFromFields({
	// 						fields,
	// 						fieldsKeys,
	// 						t,
	// 						className: nameWithFirstLetterUpperCase,
	// 					})
	// 				},
	// 			})

	// 			const typeUpdateInput = inputObjectType({
	// 				name: `Update${nameWithFirstLetterUpperCase}Input`,
	// 				definition: (t) => {
	// 					t.nonNull.id('id')
	// 					t.field('fields', { type: typeInput })
	// 				},
	// 			})

	// const typeUpdatesInput = inputObjectType({
	// 	name: `Update${nameWithFirstLetterUpperCase}sInput`,
	// 	definition: (t) => {
	// 		fieldsKeys.map((fieldName) => {
	// 			const field = schema.getFields()[fieldName]

	// 			t.field(fieldName, {
	// 				type: getWhereInputFromType({
	// 					valueArrayType:
	// 						field.type === 'array'
	// 							? field.valueType
	// 							: undefined,
	// 					typeField: field,
	// 					name: `Update${fieldName[0].toUpperCase()}${fieldName.slice(
	// 						1,
	// 					)}`,
	// 				}),
	// 			})
	// 		})
	// 	},
	// })

	// 			const typeDeleteInput = inputObjectType({
	// 				name: `Delete${nameWithFirstLetterUpperCase}Input`,
	// 				definition: (t) => {
	// 					t.nonNull.id('id')
	// 				},
	// 			})

	// 			const typeDeletesInput = inputObjectType({
	// 				name: `Delete${nameWithFirstLetterUpperCase}sInput`,
	// 				definition: (t) => {
	// 					fieldsKeys.map((fieldName) => {
	// 						t.field(fieldName, {
	// 							type: getWhereInputFromType({
	// 								typeField: schema.getFields()[fieldName],
	// 								name: `Delete${fieldName[0].toUpperCase()}${fieldName.slice(
	// 									1,
	// 								)}`,
	// 							}),
	// 						})
	// 					})
	// 				},
	// 			})

	// 			const mutations = extendType({
	// 				type: 'Mutation',
	// 				definition: (t) => {
	// t.field(`create${nameWithFirstLetterUpperCase}`, {
	// 	type: nameWithFirstLetterUpperCase,
	// 	args: { input: arg({ type: typeInput }) },
	// 	resolve: async (root, args, ctx, info) => {
	// 		const fields = getFieldsFromInfo(info)

	// 		if (!fields)
	// 			throw new Error('No fields provided')

	// 		return databaseController.createObject<any>({
	// 			className: nameWithFirstLetterUpperCase,
	// 			data: args.input,
	// 			fields,
	// 		})
	// 	},
	// })

	// 					t.field(`create${nameWithFirstLetterUpperCase}s`, {
	// 						type: list(nameWithFirstLetterUpperCase),
	// 						args: { input: arg({ type: typeInput }) },
	// 						resolve: (root, args) => {},
	// 					})

	// 					t.field(`update${nameWithFirstLetterUpperCase}`, {
	// 						type: nameWithFirstLetterUpperCase,
	// 						args: {
	// 							input: arg({ type: typeUpdateInput }),
	// 						},
	// 						resolve: (root, args) => {},
	// 					})

	// 					t.list.field(`update${nameWithFirstLetterUpperCase}s`, {
	// 						type: nameWithFirstLetterUpperCase,
	// 						args: {
	// 							where: arg({ type: typeUpdatesInput }),
	// 						},
	// 						resolve: (root, args) => {},
	// 					})

	// 					t.field(`delete${nameWithFirstLetterUpperCase}`, {
	// 						type: nameWithFirstLetterUpperCase,
	// 						args: { input: arg({ type: typeDeleteInput }) },
	// 						resolve: (root, args) => {},
	// 					})

	// 					t.list.field(`delete${nameWithFirstLetterUpperCase}s`, {
	// 						type: nameWithFirstLetterUpperCase,
	// 						args: {
	// 							where: arg({ type: typeDeletesInput }),
	// 						},
	// 						resolve: (root, args) => {},
	// 					})
	// 				},
	// 			})

	// 			return [object, queries, mutations]
	// 		})
	// 		.flat()

	// 	return arrayOfType
	// }
}
