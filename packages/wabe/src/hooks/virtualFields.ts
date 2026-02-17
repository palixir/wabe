import type { Hook } from '.'
import type { DevWabeTypes } from '../utils/helper'

type VirtualFieldDefinition = {
	type: 'Virtual'
	dependsOn: string[]
	callback: (object: Record<string, unknown>) => unknown
}

const isVirtualFieldDefinition = (value: unknown): value is VirtualFieldDefinition => {
	if (!value || typeof value !== 'object') return false

	return 'type' in value && value.type === 'Virtual'
}

export const defaultVirtualFieldsAfterRead: Hook<DevWabeTypes, any>['callback'] = (hookObject) => {
	const object = hookObject.object

	if (!object) return

	const classDefinition = hookObject.context.wabe.config.schema?.classes?.find(
		(c) => c.name === hookObject.className,
	)

	if (!classDefinition) return

	const selectedFields = Object.keys(hookObject.select || {})

	if (selectedFields.length === 0) return

	for (const fieldName of selectedFields) {
		const fieldDefinition = classDefinition.fields[fieldName]

		if (!isVirtualFieldDefinition(fieldDefinition)) continue

		object[fieldName] = fieldDefinition.callback(object)
	}
}
