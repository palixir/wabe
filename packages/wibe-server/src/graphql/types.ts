import { inputObjectType, objectType } from 'nexus'
import { ArrayValueType, TypeField } from '../schema/interface'
import { NexusGenInputs, NexusGenScalars } from '../../generated/nexusTypegen'
import { AllNexusInputTypeDefs } from 'nexus/dist/core'

type NexusType =
	| keyof NexusGenInputs
	| keyof NexusGenScalars
	| AllNexusInputTypeDefs

export const getWhereInputFromType = ({
	typeField,
	name,
	valueArrayType,
}: {
	valueArrayType?: ArrayValueType
	typeField: TypeField
	name: string
}) => {
	const type = typeField.type as NexusType

	return inputObjectType({
		name: `Where${name}Input`,
		definition: (t) => {
			if (typeField.type === 'array') {
				t.list.field('in', {
					type: typeField.valueType as NexusType,
				})

				t.list.field('notIn', {
					type: typeField.valueType as NexusType,
				})

				return
			}

			t.field('equalTo', {
				type,
			})
			t.field('notEqualTo', {
				type,
			})

			if (type === 'Int' || type === 'Float') {
				t.field('greaterThan', { type })
				t.field('greaterThanOrEqualTo', { type })
				t.field('lessThan', { type })
				t.field('lessThanOrEqualTo', { type })
			}
		},
	})
}
