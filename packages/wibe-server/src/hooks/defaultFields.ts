import { getClassFromClassName } from '../utils'
import type { DevWibeAppTypes } from '../utils/helper'
import type { HookObject } from './HookObject'

export const defaultBeforeCreateForCreatedAt = async (
	object: HookObject<any>,
) => {
	object.upsertNewData('createdAt', new Date())
	object.upsertNewData('updatedAt', new Date())
}

export const defaultBeforeUpdateForUpdatedAt = async (
	object: HookObject<any>,
) => {
	object.upsertNewData('updatedAt', new Date())
}

export const defaultBeforeCreateForDefaultValue = async (
	object: HookObject<any>,
) => {
	const schemaClass = getClassFromClassName<DevWibeAppTypes>(
		object.className,
		object.context.wibe.config,
	)

	const allFields = Object.keys(schemaClass.fields)

	allFields.map((field) => {
		const currentSchemaField = schemaClass.fields[field]

		if (
			!object.isFieldUpdate(field) &&
			currentSchemaField.type !== 'Pointer' &&
			currentSchemaField.type !== 'Relation' &&
			currentSchemaField.type !== 'File' &&
			currentSchemaField.defaultValue !== undefined
		)
			object.upsertNewData(field, currentSchemaField.defaultValue)
	})
}
