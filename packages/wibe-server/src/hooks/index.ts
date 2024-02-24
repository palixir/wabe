import { WibeSchemaTypes, _User } from '../../generated/wibe'
import { WibeApp } from '../server'
import { notEmpty } from '../utils/helper'
import { HookObject } from './HookObject'
import {
	defaultAfterInsertToCallSignUpEvent,
	defaultBeforeInsertForCreatedAt,
	defaultBeforeInsertForDefaultValue,
	defaultBeforeUpdateForUpdatedAt,
} from './defaultHooks'

export enum OperationType {
	AfterInsert = 'afterInsert',
	AfterUpdate = 'afterUpdate',
	AfterDelete = 'afterDelete',
	BeforeInsert = 'beforeInsert',
	BeforeUpdate = 'beforeUpdate',
	BeforeDelete = 'beforeDelete',
}

export type Hook<
	T extends keyof WibeSchemaTypes,
	K extends keyof WibeSchemaTypes[T],
> = {
	operationType: OperationType
	// If the className is undefined the hook is called on each class
	className?: T
	// The priority of the hook. The lower the number the earlier the hook is called
	// The priority 0 is for the security hooks
	// The default priority is 1
	priority: number
	callback: (
		hookObject: HookObject<T, K>,
		context: Context,
	) => Promise<void> | void
}

export const defaultHooks: Hook<any, any>[] = [
	{
		operationType: OperationType.BeforeInsert,
		priority: 1,
		callback: defaultBeforeInsertForCreatedAt,
	},
	{
		operationType: OperationType.BeforeInsert,
		priority: 1,
		callback: defaultBeforeInsertForDefaultValue,
	},
	{
		operationType: OperationType.BeforeUpdate,
		priority: 1,
		callback: defaultBeforeUpdateForUpdatedAt,
	},
	{
		operationType: OperationType.AfterInsert,
		className: '_User',
		priority: 1,
		callback: defaultAfterInsertToCallSignUpEvent,
	},
]

export const _findHooksByPriority = async <T extends keyof WibeSchemaTypes>({
	className,
	operationType,
	priority,
}: {
	operationType: OperationType
	className: T
	priority: number
}) =>
	WibeApp.config.hooks?.filter(
		(hook) =>
			hook.operationType === operationType &&
			hook.priority === priority &&
			(className === hook.className || !hook.className),
	) || []

export const findHooksAndExecute = async <
	T extends keyof WibeSchemaTypes,
	K extends keyof WibeSchemaTypes[T],
>({
	className,
	operationType,
	fields,
	id,
	user,
	context,
}: {
	className: T
	operationType: OperationType
	fields: Array<Record<K, any>>
	id?: string
	user: _User
	context: Context
}) => {
	const listOfPriorities =
		WibeApp.config.hooks
			?.reduce((acc, hook) => {
				if (!acc.includes(hook.priority)) acc.push(hook.priority)

				return acc
			}, [] as number[])
			.sort((a, b) => a - b) || []

	// We need to keep the order of the data but we need to execute the hooks in parallel
	const computedResult = await Promise.all(
		fields.map(async (dataForOneObject, index) => {
			const hookObject = new HookObject({
				className,
				object: { fields: dataForOneObject, id },
				operationType,
				user,
			})

			// We need reduce here to keep the order of the hooks
			// Priority 0, then 1 etc...
			await listOfPriorities.reduce(async (_, priority) => {
				const hooksToCompute = await _findHooksByPriority({
					className,
					operationType,
					priority,
				})

				await Promise.all(
					hooksToCompute.map((hook) =>
						hook.callback(hookObject, context),
					),
				)
			}, Promise.resolve())

			return { index, data: hookObject.getObject().fields }
		}),
	)

	return computedResult
		.sort((a, b) => a.index - b.index)
		.map(({ data }) => data)
		.filter(notEmpty)
}

/*
before :
 - Get les valeurs modifiés ou insérés
 - Avoir le user qui a fait la request
 - Modifier ou ajouter des valeurs

after:
- Résultat de la requête
- User qui a fait la request
*/
