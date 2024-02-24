import { WibeSchemaTypes } from '../../generated/wibe'
import { Context } from '../graphql/interface'
import { WibeApp } from '../server'
import { HookObject } from './HookObject'

export const defaultBeforeInsertForCreatedAt = <
	T extends keyof WibeSchemaTypes,
	K extends keyof WibeSchemaTypes[T],
>(
	object: HookObject<T, K>,
) => {
	// @ts-expect-error
	object.set({ field: 'createdAt', value: new Date() })
	// @ts-expect-error
	object.set({ field: 'updatedAt', value: new Date() })
}

export const defaultBeforeUpdateForUpdatedAt = <
	T extends keyof WibeSchemaTypes,
	K extends keyof WibeSchemaTypes[T],
>(
	object: HookObject<T, K>,
) => {
	// @ts-expect-error
	object.set({ field: 'updatedAt', value: new Date() })
}

export const defaultBeforeInsertForDefaultValue = <
	T extends keyof WibeSchemaTypes,
	K extends keyof WibeSchemaTypes[T],
>(
	object: HookObject<T, K>,
) => {
	const schemaClass = WibeApp.config.schema.class.find(
		(schema) => schema.name === object.className,
	)

	if (!schemaClass) throw new Error('Class not found in schema')

	const allFields = Object.keys(schemaClass.fields)

	allFields.map((field) => {
		// @ts-expect-error
		if (!object.get({ field }))
			object.set({
				// @ts-expect-error
				field,
				// @ts-expect-error
				value: schemaClass?.fields[field].defaultValue,
			})
	})
}

export const defaultAfterInsertToCallSignUpEvent = async <
	T extends keyof WibeSchemaTypes,
	K extends keyof WibeSchemaTypes[T],
>(
	object: HookObject<T, K>,
	context: Context,
) => {
	// TODO : Redondant code with signInWithResolver need refactoring
	const authenticationObject = object.get({ field: 'authentication' })

	if (!authenticationObject) return

	const authenticationMethods = Object.keys(authenticationObject)

	if (authenticationMethods.length > 1 || authenticationMethods.length === 0)
		throw new Error('Only one authentication method at the time is allowed')

	const authenticationMethod = authenticationMethods[0]

	const validAuthenticationMethod =
		WibeApp.config.authentication?.customAuthenticationMethods.find(
			(method) =>
				method.name.toLowerCase() ===
				authenticationMethod.toLowerCase(),
		)

	if (!validAuthenticationMethod)
		throw new Error('No available custom authentication methods found')

	const {
		events: { onSignUp },
	} = validAuthenticationMethod

	await onSignUp({
		context,
		input: authenticationObject,
		userId: 'userId',
	})
}
