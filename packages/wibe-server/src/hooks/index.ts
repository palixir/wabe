import type { WibeSchemaTypes } from '../../generated/wibe'
import type { Context } from '../graphql/interface'
import { WibeApp } from '../server'
import { notEmpty } from '../utils/helper'
import { HookObject } from './HookObject'
import {
	defaultBeforeCreateForCreatedAt,
	defaultBeforeCreateForDefaultValue,
	defaultBeforeUpdateForUpdatedAt,
} from './defaultFields'
import {
	defaultCheckPermissionOnCreate,
	defaultCheckPermissionOnDelete,
	defaultCheckPermissionOnRead,
	defaultCheckPermissionOnUpdate,
} from './permissions'

// Here we have duplicated code but we need before and after type to simplify default hooks (permission)
export enum BeforeOperationType {
	BeforeCreate = 'beforeInsert',
	BeforeUpdate = 'beforeUpdate',
	BeforeDelete = 'beforeDelete',
	BeforeRead = 'beforeRead',
}

export enum AfterOperationType {
	AfterInsert = 'afterInsert',
	AfterUpdate = 'afterUpdate',
	AfterDelete = 'afterDelete',
	AfterRead = 'afterRead',
}

export enum OperationType {
	AfterInsert = 'afterInsert',
	AfterUpdate = 'afterUpdate',
	AfterDelete = 'afterDelete',
	AfterRead = 'afterRead',
	BeforeCreate = 'beforeInsert',
	BeforeUpdate = 'beforeUpdate',
	BeforeDelete = 'beforeDelete',
	BeforeRead = 'beforeRead',
}

export type Hook<T extends keyof WibeSchemaTypes> = {
	operationType: OperationType
	// If the className is undefined the hook is called on each class
	className?: T
	// The priority of the hook. The lower the number the earlier the hook is called
	// The priority 0 is for the security hooks
	// The default priority is 1
	priority: number
	callback: (
		hookObject: HookObject<T>,
		context: Context,
	) => Promise<void> | void
}

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

const getHooksOrderByPriorities = () =>
	WibeApp.config.hooks
		?.reduce((acc, hook) => {
			if (!acc.includes(hook.priority)) acc.push(hook.priority)

			return acc
		}, [] as number[])
		.sort((a, b) => a - b) || []

// TODO: If context is empty we need to early return
export const findHooksAndExecute = async ({
	className,
	operationType,
	newData,
	context,
}: {
	className: keyof WibeSchemaTypes
	operationType: OperationType
	newData: Array<Record<string, any>> | null
	context: Context
}) => {
	const hooksOrderByPriorities = getHooksOrderByPriorities()

	// We need to keep the order of the data but we need to execute the hooks in parallel
	const computedResult = await Promise.all(
		newData.map(async (dataForOneObject, index) => {
			const hookObject = new HookObject({
				className,
				object: dataForOneObject,
				operationType,
				context,
			})

			// We need reduce here to keep the order of the hooks
			// Priority 0, then 1 etc...
			await hooksOrderByPriorities.reduce(async (_, priority) => {
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

			return { index, data: hookObject.getObject() }
		}),
	)

	return computedResult
		.sort((a, b) => a.index - b.index)
		.map(({ data }) => data)
		.filter(notEmpty)
}

export const getDefaultHooks = (): Hook<any>[] => [
	{
		operationType: OperationType.BeforeRead,
		priority: 0,
		callback: defaultCheckPermissionOnRead,
	},
	{
		operationType: OperationType.BeforeUpdate,
		priority: 0,
		callback: defaultCheckPermissionOnUpdate,
	},
	{
		operationType: OperationType.BeforeCreate,
		priority: 0,
		callback: defaultCheckPermissionOnCreate,
	},
	{
		operationType: OperationType.BeforeDelete,
		priority: 0,
		callback: defaultCheckPermissionOnDelete,
	},
	{
		operationType: OperationType.BeforeCreate,
		priority: 1,
		callback: defaultBeforeCreateForCreatedAt,
	},
	{
		operationType: OperationType.BeforeCreate,
		priority: 1,
		callback: defaultBeforeCreateForDefaultValue,
	},
	{
		operationType: OperationType.BeforeUpdate,
		priority: 1,
		callback: defaultBeforeUpdateForUpdatedAt,
	},
]
