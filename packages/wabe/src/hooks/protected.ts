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
		assertCanReadSelect({
			select: hookObject.select,
			fields: schemaClass.fields,
			context: hookObject.context,
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

/**
 * Recursively asserts that the caller is allowed to read every field present in `select`,
 * including nested object/array subfields (e.g. `authentication.emailPassword.password`).
 * Throws as soon as an unauthorized protected field is requested.
 */
export const assertCanReadSelect = ({
	select,
	fields,
	context,
}: {
	select?: Record<string, any>
	fields?: Record<string, any>
	context: Pick<WabeContext<any>, 'isRoot' | 'user'>
}): void => {
	if (!select || !fields) return

	for (const fieldName of Object.keys(select)) {
		if (fieldName === '_args') continue

		const fieldDefinition = fields[fieldName]
		if (!fieldDefinition) continue

		if (!canUserReadField({ fields }, fieldName, context))
			throw new Error('You are not authorized to read this field')

		const selectedValue = select[fieldName]

		if (
			(fieldDefinition.type === 'Object' ||
				(fieldDefinition.type === 'Array' && fieldDefinition.typeValue === 'Object')) &&
			fieldDefinition.object?.fields &&
			selectedValue &&
			typeof selectedValue === 'object'
		)
			assertCanReadSelect({
				select: selectedValue,
				fields: fieldDefinition.object.fields,
				context,
			})
	}
}

const WHERE_OPERATORS = new Set([
	'equalTo',
	'notEqualTo',
	'greaterThan',
	'greaterThanOrEqualTo',
	'lessThan',
	'lessThanOrEqualTo',
	'in',
	'notIn',
	'contains',
	'notContains',
	'exists',
])

/**
 * Asserts that every field referenced in a `where` filter is readable by the caller. Filtering on a
 * protected field (e.g. a password hash) would otherwise act as an oracle: an attacker could probe
 * secret values byte by byte through the boolean result of the query.
 */
export const assertCanReadWhere = ({
	where,
	fields,
	context,
}: {
	where?: Record<string, any>
	fields?: Record<string, any>
	context: Pick<WabeContext<any>, 'isRoot' | 'user'>
}): void => {
	if (!where || !fields) return

	for (const fieldName of Object.keys(where)) {
		const value = where[fieldName]

		if (fieldName === 'OR' || fieldName === 'AND') {
			if (Array.isArray(value))
				for (const subWhere of value) assertCanReadWhere({ where: subWhere, fields, context })
			continue
		}

		const fieldDefinition = fields[fieldName]
		if (!fieldDefinition) continue

		if (!canUserReadField({ fields }, fieldName, context))
			throw new Error('You are not authorized to filter by this field')

		if (
			fieldDefinition.type === 'Object' &&
			fieldDefinition.object?.fields &&
			value &&
			typeof value === 'object' &&
			!Object.keys(value).some((key) => WHERE_OPERATORS.has(key))
		)
			assertCanReadWhere({ where: value, fields: fieldDefinition.object.fields, context })
	}
}

/**
 * Asserts that every field referenced in an `order` clause is readable by the caller, for the same
 * oracle reasons as {@link assertCanReadWhere}.
 */
export const assertCanReadOrder = ({
	order,
	fields,
	context,
}: {
	order?: Record<string, any>
	fields?: Record<string, any>
	context: Pick<WabeContext<any>, 'isRoot' | 'user'>
}): void => {
	if (!order || !fields) return

	for (const fieldName of Object.keys(order)) {
		const fieldDefinition = fields[fieldName]
		if (!fieldDefinition) continue

		if (!canUserReadField({ fields }, fieldName, context))
			throw new Error('You are not authorized to order by this field')
	}
}

/**
 * Recursively removes protected fields (including nested object/array subfields such as
 * `authentication.emailPassword.password`) that the current caller is not allowed to read.
 *
 * This is the last line of defense against secret leakage: protected hooks on `BeforeRead`
 * only inspect the top-level (and flattened) selection, so nested secrets would otherwise be
 * returned whenever the parent object is selected as a whole or when the select is empty.
 */
export const redactProtectedReadFields = ({
	object,
	fields,
	context,
}: {
	object: any
	fields?: Record<string, any>
	context: Pick<WabeContext<any>, 'isRoot' | 'user'>
}): void => {
	if (!object || typeof object !== 'object' || !fields) return

	for (const fieldName of Object.keys(object)) {
		const fieldDefinition = fields[fieldName]
		if (!fieldDefinition) continue

		if (!canUserReadField({ fields }, fieldName, context)) {
			object[fieldName] = undefined
			continue
		}

		const value = object[fieldName]

		if (
			fieldDefinition.type === 'Object' &&
			fieldDefinition.object?.fields &&
			value &&
			typeof value === 'object'
		) {
			redactProtectedReadFields({
				object: value,
				fields: fieldDefinition.object.fields,
				context,
			})
			continue
		}

		if (
			fieldDefinition.type === 'Array' &&
			fieldDefinition.typeValue === 'Object' &&
			fieldDefinition.object?.fields &&
			Array.isArray(value)
		) {
			for (const item of value)
				redactProtectedReadFields({
					object: item,
					fields: fieldDefinition.object.fields,
					context,
				})
		}
	}
}

export const defaultRedactProtectedFieldsAfterRead = (
	hookObject: HookObject<DevWabeTypes, any>,
) => {
	const object = hookObject.object

	if (!object) return

	const schemaClass = hookObject.context.wabe.config.schema?.classes?.find(
		(currentClass) => currentClass.name === hookObject.className,
	)

	if (!schemaClass) return

	redactProtectedReadFields({
		object,
		fields: schemaClass.fields,
		context: hookObject.context,
	})
}

export const defaultCheckProtectedOnBeforeRead = (object: HookObject<DevWabeTypes, any>) =>
	_checkProtected(object, OperationType.BeforeRead)

export const defaultCheckProtectedOnBeforeUpdate = (object: HookObject<DevWabeTypes, any>) =>
	_checkProtected(object, OperationType.BeforeUpdate)

export const defaultCheckProtectedOnBeforeCreate = (object: HookObject<DevWabeTypes, any>) =>
	_checkProtected(object, OperationType.BeforeCreate)
