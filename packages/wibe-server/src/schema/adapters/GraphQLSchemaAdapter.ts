import { nonNull, objectType } from 'nexus'
import { Schema } from '../Schema'

export class GraphQLSchemaAdapter {
	private schema: Schema[]

	constructor(schema: Schema[]) {
		this.schema = schema
	}

	createSchema() {
		if (!this.schema) throw new Error('Schema not found')

		const arrayOfType = this.schema.map((schema) => {
			const fields = schema.getFields()
			const name = schema.getName().replace(' ', '')

			return objectType({
				name,
				definition(t) {
					Object.keys(fields).map((fieldName) => {
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
		})

		return arrayOfType
	}
}
