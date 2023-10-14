import { inputObjectType, objectType } from 'nexus'
import { TypeField } from '../schema/interface'

// where : {age : {equalTo : 20}}

export const getWhereInputFromType = ({
	typeField,
	name,
}: {
	typeField: TypeField
	name: string
}) => {
	return inputObjectType({
		name: `Where${name}Input`,
		definition: (t) => {
			t.field('equalTo', { type: typeField.type })
			t.field('notEqualTo', { type: typeField.type })

			if (typeField.type === 'Int' || typeField.type === 'Float') {
				t.field('greaterThan', { type: typeField.type })
				t.field('greaterThanOrEqualTo', { type: typeField.type })
				t.field('lessThan', { type: typeField.type })
				t.field('lessThanOrEqualTo', { type: typeField.type })
			}
		},
	})
}
