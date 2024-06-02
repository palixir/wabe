import { getClassFromClassName } from '../utils'
import { HookObject } from './HookObject'

export const defaultBeforeInsertForCreatedAt = async (
	object: HookObject<any>,
) => {
	object.set({ field: 'createdAt', value: new Date() })
	object.set({ field: 'updatedAt', value: new Date() })
}

export const defaultBeforeUpdateForUpdatedAt = async (
	object: HookObject<any>,
) => {
	object.set({ field: 'updatedAt', value: new Date() })
}

export const defaultBeforeInsertForDefaultValue = async (
	object: HookObject<any>,
) => {
	const schemaClass = getClassFromClassName(object.className)

	const allFields = Object.keys(schemaClass.fields)

	allFields.map((field) => {
		const currentSchemaField = schemaClass.fields[field]

		if (
			!object.get(field) &&
			currentSchemaField.type !== 'Pointer' &&
			currentSchemaField.type !== 'Relation' &&
			currentSchemaField.defaultValue !== undefined
		)
			object.set({
				field,
				value: currentSchemaField.defaultValue,
			})
	})
}