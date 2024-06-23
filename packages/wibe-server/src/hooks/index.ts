import type { WibeSchemaTypes } from '../../generated/wibe'
import type { WhereType } from '../database'
import type { Context } from '../graphql/interface'
import { WibeApp } from '../server'
import { HookObject } from './HookObject'
import {
	defaultBeforeCreateForCreatedAt,
	defaultBeforeCreateForDefaultValue,
	defaultBeforeUpdateForUpdatedAt,
} from './defaultFields'
import { defaultBeforeCreateUpload, defaultBeforeUpdateUpload } from './file'
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
	callback: (hookObject: HookObject<T>) => Promise<void> | void
}

export type TypedNewData<T extends keyof WibeSchemaTypes> = Record<
	keyof WibeSchemaTypes[T],
	any
> | null

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

export const initializeHook = async <T extends keyof WibeSchemaTypes>({
	className,
	newData,
	context,
	id,
	where,
	skipHooks,
}: {
	id?: string
	where?: WhereType<any>
	className: keyof WibeSchemaTypes
	newData: TypedNewData<any>
	context: Context
	skipHooks?: boolean
}) => {
	if (skipHooks) return { run: async () => ({}) }

	const objects = await WibeApp.databaseController.getObjects({
		className,
		context: { isRoot: true },
		fields: [],
		where: where ? where : { id: { equalTo: id } },
		skipHooks: true,
	})

	// We need to have at least one loop on all hooks
	const objectsToMap =
		objects && objects.length > 0 ? objects : [newData || {}]

	return {
		run: async (
			operationType: OperationType,
		): Promise<Record<keyof WibeSchemaTypes[T], any>> => {
			const hooksOrderByPriorities = getHooksOrderByPriorities()

			const res = await Promise.all(
				objectsToMap.map(async (object) => {
					const hookObject = new HookObject({
						className,
						newData,
						operationType,
						context,
						object,
					})

					// We need to keep the order of the data but we need to execute the hooks in parallel
					await hooksOrderByPriorities.reduce(
						async (acc, priority) => {
							await acc

							const hooksToCompute = await _findHooksByPriority({
								className,
								operationType,
								priority,
							})

							await Promise.all(
								hooksToCompute.map((hook) =>
									hook.callback(hookObject),
								),
							)
						},
						Promise.resolve(),
					)

					return hookObject.getNewData()
				}),
			)

			// Here we return the first element because we had a map on all the objects
			// But the input of each object (params.data) is the same so the result of each output
			// will be the same. Index 0 is arbitrary
			return res[0]
		},
	}
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
	{
		operationType: OperationType.BeforeCreate,
		priority: 1,
		callback: defaultBeforeCreateUpload,
	},
	{
		operationType: OperationType.BeforeUpdate,
		priority: 1,
		callback: defaultBeforeUpdateUpload,
	},
]
