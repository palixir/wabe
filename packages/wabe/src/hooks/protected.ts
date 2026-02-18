import { OperationType } from '.'
import type { DevWabeTypes } from '../utils/helper'
import type { HookObject } from './HookObject'
import type { SchemaClassWithProtectedFields } from '../schema/Schema'
import type { WabeContext } from '../server/interface'

const _checkProtected = (
	hookObject: HookObject<DevWabeTypes, any>,
	operationType: OperationType,
) => {
	const schemaClass = hookObject.context.wabe.config.schema?.classes?.find(
		(currentClass) => currentClass.name === hookObject.className,
	)

	if (!schemaClass) return

	const userRole = hookObject.getUser()?.role?.name || ''
	const isRoot = hookObject.context.isRoot

	if (operationType === OperationType.BeforeRead) {
		Object.keys(hookObject.select).forEach((fieldName) => {
			const protectedForCurrentField = schemaClass.fields[fieldName]?.protected

			if (!protectedForCurrentField) return

			if (protectedForCurrentField?.protectedOperations.includes('read')) {
				if (isRoot && protectedForCurrentField.authorizedRoles.includes('rootOnly')) return

				// @ts-expect-error
				if (!protectedForCurrentField.authorizedRoles.includes(userRole))
					throw new Error('You are not authorized to read this field')
			}
		})

		return
	}

	const fieldsUpdated = hookObject.getNewData()

	const operation = operationType === OperationType.BeforeUpdate ? 'update' : 'create'

	Object.keys(fieldsUpdated).forEach((fieldName) => {
		const protectedForCurrentField = schemaClass.fields[fieldName]?.protected

		if (protectedForCurrentField?.protectedOperations.includes(operation)) {
			if (isRoot && protectedForCurrentField.authorizedRoles.includes('rootOnly')) return

			// @ts-expect-error
			if (!protectedForCurrentField.authorizedRoles.includes(userRole))
				throw new Error(`You are not authorized to ${operation} this field`)
		}
	})
}

export const canUserReadField = (
	schemaClass: SchemaClassWithProtectedFields,
	fieldName: string,
	context: Pick<WabeContext<any>, 'isRoot' | 'user'>,
): boolean => {
	const protectedForField = schemaClass.fields[fieldName]?.protected
	if (!protectedForField || !protectedForField.protectedOperations.includes('read')) return true
	if (context.isRoot && protectedForField.authorizedRoles.includes('rootOnly')) return true
	const userRole = context.user?.role?.name || ''
	return protectedForField.authorizedRoles.includes(userRole)
}

export const defaultCheckProtectedOnBeforeRead = (object: HookObject<DevWabeTypes, any>) =>
	_checkProtected(object, OperationType.BeforeRead)

export const defaultCheckProtectedOnBeforeUpdate = (object: HookObject<DevWabeTypes, any>) =>
	_checkProtected(object, OperationType.BeforeUpdate)

export const defaultCheckProtectedOnBeforeCreate = (object: HookObject<DevWabeTypes, any>) =>
	_checkProtected(object, OperationType.BeforeCreate)
