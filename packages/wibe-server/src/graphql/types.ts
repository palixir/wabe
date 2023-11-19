import { inputObjectType, objectType } from 'nexus'
import { ArrayValueType, TypeField } from '../schema/interface'
import {
	NexusGenInputs,
	NexusGenObjects,
	NexusGenScalars,
} from '../../generated/nexusTypegen'
import { InputDefinitionBlock, ObjectDefinitionBlock } from 'nexus/dist/core'

const getWhereDefinitionType = <T extends string>({
	t,
	typeField,
}: {
	t: any
	typeField: TypeField
}) => {
	const type = typeField.type

	if (type === 'array') {
		t.list.field('in', {
			type: typeField.valueType as
				| keyof NexusGenScalars
				| keyof NexusGenObjects,
		})

		t.list.field('notIn', {
			type: typeField.valueType as
				| keyof NexusGenScalars
				| keyof NexusGenObjects,
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
}

export const getWhereFromType = ({
	typeField,
	name,
	valueArrayType,
}: {
	valueArrayType?: ArrayValueType
	typeField: TypeField
	name: string
}) => {
	return objectType({
		name: `Where${name}`,
		definition: (t) => {
			getWhereDefinitionType({ t, typeField })
		},
	})
}

export const getWhereInputFromType = ({
	typeField,
	name,
	valueArrayType,
}: {
	valueArrayType?: ArrayValueType
	typeField: TypeField
	name: string
}) => {
	return inputObjectType({
		name: `Where${name}Input`,
		definition: (t) => {
			getWhereDefinitionType({ t, typeField })
		},
	})
}
