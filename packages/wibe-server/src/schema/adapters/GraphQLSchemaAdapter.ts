import { nonNull, objectType, extendType, arg, inputObjectType } from 'nexus'
import { Schema } from '../Schema'
import { SchemaFields } from '../interface'

export class GraphQLSchemaAdapter {
	private schema: Schema[]

	constructor(schema: Schema[]) {
		this.schema = schema
	}

	private getTypesFromFields({
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

	createSchema() {
		if (!this.schema) throw new Error('Schema not found')

		const arrayOfType = this.schema
			.map((schema) => {
				const fields = schema.getFields()
				const name = schema.getName().replace(' ', '')
				const nameWithFirstLetterUpperCase = `${name[0].toUpperCase()}${name.slice(
					1,
				)}`

				const fieldsKeys = Object.keys(fields)

				const object = objectType({
					name: nameWithFirstLetterUpperCase,
					definition: (t) => {
						this.getTypesFromFields({ fields, fieldsKeys, t })
					},
				})

				const query = extendType({
					type: 'Query',
					definition: (t) => {
						t.field(name, {
							type: nameWithFirstLetterUpperCase,
							args: { id: nonNull('String') },
							resolve: (root, args) => {},
						})

						t.list.field(`${name}s`, {
							type: nameWithFirstLetterUpperCase,
							resolve: (root, args) => {},
						})
					},
				})

				const typeCreateInput = inputObjectType({
					name: `Create${nameWithFirstLetterUpperCase}Input`,
					definition: (t) => {
						this.getTypesFromFields({ fields, fieldsKeys, t })
					},
				})

				const typeUpdateInput = inputObjectType({
					name: `Update${nameWithFirstLetterUpperCase}Input`,
					definition: (t) => {
						t.nonNull.id('id')
						this.getTypesFromFields({ fields, fieldsKeys, t })
					},
				})

				const mutations = extendType({
					type: 'Mutation',
					definition: (t) => {
						t.field(`create${nameWithFirstLetterUpperCase}`, {
							type: nameWithFirstLetterUpperCase,
							args: { input: typeCreateInput },
							resolve: (root, args) => {},
						})

						t.field(`update${nameWithFirstLetterUpperCase}`, {
							type: nameWithFirstLetterUpperCase,
							args: { input: typeUpdateInput },
							resolve: (root, args) => {},
						})
					},
				})

				return [object, query, mutations]
			})
			.flat()

		return arrayOfType
	}
}
