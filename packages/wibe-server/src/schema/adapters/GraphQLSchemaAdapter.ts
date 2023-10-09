import { nonNull, objectType, extendType } from 'nexus'
import { Schema } from '../Schema'

export class GraphQLSchemaAdapter {
	private schema: Schema[]

	constructor(schema: Schema[]) {
		this.schema = schema
	}

	createSchema() {
		if (!this.schema) throw new Error('Schema not found')

		const arrayOfType = this.schema
			.map((schema) => {
				const fields = schema.getFields()
				const name = schema.getName().replace(' ', '')

				const fieldsKeys = Object.keys(fields)

				const object = objectType({
					name,
					definition: (t) => {
						fieldsKeys.map((fieldName) => {
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
					},
				})

				const query = extendType({
					type: 'Query',
					definition: (t) => {
						t.field(name, {
							type: name,
							args: { id: nonNull('String') },
							resolve: (root, args) => {},
						})

						t.list.field(`${name}s`, {
							type: name,
							resolve: (root, args) => {},
						})
					},
				})

				return [object, query]
			})
			.flat()

		return arrayOfType
	}
}
