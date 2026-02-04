import { getClassFromClassName } from '../utils'
import type { DevWabeTypes } from '../utils/helper'
import type { HookObject } from './HookObject'

export const defaultBeforeCreateForCreatedAt = (object: HookObject<any, any>) => {
	if (!object.isFieldUpdated('createdAt')) object.upsertNewData('createdAt', new Date())

	if (!object.isFieldUpdated('updatedAt')) object.upsertNewData('updatedAt', new Date())
}

export const defaultBeforeUpdateForUpdatedAt = (object: HookObject<any, any>) => {
	object.upsertNewData('updatedAt', new Date())
}

export const defaultBeforeCreateForDefaultValue = (object: HookObject<any, any>) => {
	const schemaClass = getClassFromClassName<DevWabeTypes>(
		object.className,
		object.context.wabe.config,
	)
	const allFields = Object.keys(schemaClass.fields)
	allFields.forEach((field) => {
		const currentSchemaField = schemaClass.fields[field]
		if (
			!object.isFieldUpdated(field) &&
			currentSchemaField?.type !== 'Pointer' &&
			currentSchemaField?.type !== 'Relation' &&
			currentSchemaField?.type !== 'File' &&
			currentSchemaField?.defaultValue !== undefined
		)
			object.upsertNewData(field, currentSchemaField.defaultValue)
	})
}
