import {
	nonNull,
	objectType,
	extendType,
	arg,
	inputObjectType,
	list,
} from 'nexus'
import { Schema } from '../Schema'
import { SchemaFields } from '../interface'
import { getFieldsFromInfo, getWhereInputFromType } from '../../graphql'
import { NexusGenFieldTypes } from '../../../generated/nexusTypegen'
import { DatabaseController } from '../../database/controllers/DatabaseController'

export class GraphQLSchemaAdapter {
	private schema: Schema[]

	constructor(schema: Schema[]) {
		this.schema = schema
	}

	_getTypesFromFields({
		fields,
		fieldsKeys,
		t,
	}: {
		fields: SchemaFields
		fieldsKeys: string[]
		t: any
	}) {
		return fieldsKeys.map((fieldName) => {
			const typeField = fields[fieldName]

			if (typeField.type === 'array')
				return t.list.field(fieldName, {
					type: typeField.valueType,
				})

			return t.field(fieldName, {
				type: typeField.required
					? nonNull(typeField.type)
					: typeField.type,
			})
		})
	}

	createSchema(databaseController: DatabaseController) {
		if (!this.schema) throw new Error('Schema not found')

		const arrayOfType = this.schema
			.map((schema) => {
				const fields = schema.getFields()
				const name = schema.getName().replace(' ', '')

				const nameWithFirstLetterLowerCase =
					`${name[0].toLowerCase()}${name.slice(
						1,
					)}` as keyof NexusGenFieldTypes

				const nameWithFirstLetterUpperCase =
					`${name[0].toUpperCase()}${name.slice(
						1,
					)}` as keyof NexusGenFieldTypes

				const fieldsKeys = Object.keys(fields)

				const object = objectType({
					name: nameWithFirstLetterUpperCase,
					definition: (t) => {
						this._getTypesFromFields({ fields, fieldsKeys, t })
					},
				})

				const queries = extendType({
					type: 'Query',
					definition: (t) => {
						t.field(nameWithFirstLetterLowerCase, {
							type: nameWithFirstLetterUpperCase,
							args: { id: nonNull('String') },
							resolve: async (_, { id }, __, info) => {
								const fields = getFieldsFromInfo(info)

								if (!fields)
									throw new Error('No fields provided')

								await databaseController.getObject<any>({
									className: nameWithFirstLetterUpperCase,
									id,
									fields,
								})
							},
						})

						t.list.field(`${nameWithFirstLetterLowerCase}s`, {
							type: nameWithFirstLetterUpperCase,
							resolve: (root, args) => {},
						})
					},
				})

				const typeInput = inputObjectType({
					name: `${nameWithFirstLetterUpperCase}Input`,
					definition: (t) => {
						this._getTypesFromFields({ fields, fieldsKeys, t })
					},
				})

				const typeUpdateInput = inputObjectType({
					name: `Update${nameWithFirstLetterUpperCase}Input`,
					definition: (t) => {
						t.nonNull.id('id')
						t.field('fields', { type: typeInput })
					},
				})

				const typeUpdatesInput = inputObjectType({
					name: `Update${nameWithFirstLetterUpperCase}sInput`,
					definition: (t) => {
						fieldsKeys.map((fieldName) => {
							const field = schema.getFields()[fieldName]

							t.field(fieldName, {
								type: getWhereInputFromType({
									valueArrayType:
										field.type === 'array'
											? field.valueType
											: undefined,
									typeField: field,
									name: `Update${fieldName[0].toUpperCase()}${fieldName.slice(
										1,
									)}`,
								}),
							})
						})
					},
				})

				const typeDeleteInput = inputObjectType({
					name: `Delete${nameWithFirstLetterUpperCase}Input`,
					definition: (t) => {
						t.nonNull.id('id')
					},
				})

				const typeDeletesInput = inputObjectType({
					name: `Delete${nameWithFirstLetterUpperCase}sInput`,
					definition: (t) => {
						fieldsKeys.map((fieldName) => {
							t.field(fieldName, {
								type: getWhereInputFromType({
									typeField: schema.getFields()[fieldName],
									name: `Delete${fieldName[0].toUpperCase()}${fieldName.slice(
										1,
									)}`,
								}),
							})
						})
					},
				})

				const mutations = extendType({
					type: 'Mutation',
					definition: (t) => {
						t.field(`create${nameWithFirstLetterUpperCase}`, {
							type: nameWithFirstLetterUpperCase,
							args: { input: arg({ type: typeInput }) },
							resolve: (root, args) => {},
						})

						t.field(`create${nameWithFirstLetterUpperCase}s`, {
							type: list(nameWithFirstLetterUpperCase),
							args: { input: arg({ type: typeInput }) },
							resolve: (root, args) => {},
						})

						t.field(`update${nameWithFirstLetterUpperCase}`, {
							type: nameWithFirstLetterUpperCase,
							args: {
								input: arg({ type: typeUpdateInput }),
							},
							resolve: (root, args) => {},
						})

						t.list.field(`update${nameWithFirstLetterUpperCase}s`, {
							type: nameWithFirstLetterUpperCase,
							args: {
								where: arg({ type: typeUpdatesInput }),
							},
							resolve: (root, args) => {},
						})

						t.field(`delete${nameWithFirstLetterUpperCase}`, {
							type: nameWithFirstLetterUpperCase,
							args: { input: arg({ type: typeDeleteInput }) },
							resolve: (root, args) => {},
						})

						t.list.field(`delete${nameWithFirstLetterUpperCase}s`, {
							type: nameWithFirstLetterUpperCase,
							args: {
								where: arg({ type: typeDeletesInput }),
							},
							resolve: (root, args) => {},
						})
					},
				})

				return [object, queries, mutations]
			})
			.flat()

		return arrayOfType
	}
}
