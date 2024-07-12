import type { WhereType } from '../database'
import {
	defaultBeforeCreateUpload,
	defaultBeforeUpdateUpload,
} from '../files/hookUploadFile'
import type { WibeContext } from '../server/interface'
import type { WibeConfig, WibeAppTypes } from '../server'
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
import {
	defaultCallAuthenticationProviderOnBeforeCreateUser,
	defaultCallAuthenticationProviderOnBeforeUpdateUser,
} from './authentication'

export enum OperationType {
	AfterCreate = 'AfterCreate',
	AfterUpdate = 'afterUpdate',
	AfterDelete = 'afterDelete',
	AfterRead = 'afterRead',
	BeforeCreate = 'beforeInsert',
	BeforeUpdate = 'beforeUpdate',
	BeforeDelete = 'beforeDelete',
	BeforeRead = 'beforeRead',
}

export type Hook<T extends WibeAppTypes> = {
	operationType: OperationType
	// If the className is undefined the hook is called on each class
	className?: T
	// The priority of the hook. The lower the number the earlier the hook is called
	// The priority 0 is for the security hooks
	// The default priority is 1
	priority: number
	callback: (hookObject: HookObject<T>) => Promise<void> | void
}

export type TypedNewData<T extends keyof WibeAppTypes['types']> = Record<
	keyof WibeAppTypes['types'][T],
	any
> | null

export const _findHooksByPriority = async <
	T extends keyof WibeAppTypes['types'],
>({
	className,
	operationType,
	priority,
	config,
}: {
	operationType: OperationType
	className: T
	priority: number
	config: WibeConfig<any>
}) =>
	config.hooks?.filter(
		(hook) =>
			hook.operationType === operationType &&
			hook.priority === priority &&
			(className === hook.className || !hook.className),
	) || []

const getHooksOrderByPriorities = (config: WibeConfig<any>) =>
	config.hooks
		?.reduce((acc, hook) => {
			if (!acc.includes(hook.priority)) acc.push(hook.priority)

			return acc
		}, [] as number[])
		.sort((a, b) => a - b) || []

export const initializeHook = async <T extends keyof WibeAppTypes['types']>({
	className,
	newData,
	context,
	skipHooks,
}: {
	className: T
	newData: TypedNewData<any>
	context: WibeContext<any>
	skipHooks?: boolean
}) => {
	if (skipHooks) return { run: async () => ({}) }

	return {
		run: async ({
			operationType,
			where,
			id,
		}: {
			operationType: OperationType
			id?: string
			where?: WhereType<any, any>
		}): Promise<Record<keyof WibeAppTypes['types'][T], any>> => {
			const hooksOrderByPriorities = getHooksOrderByPriorities(
				context.wibe.config,
			)

			const objects =
				// Before create we don't have any objects
				operationType !== OperationType.BeforeCreate
					? await context.wibe.databaseController.getObjects({
							className,
							context: {
								...context,
								isRoot: true,
							},
							fields: ['*'],
							where: where ? where : { id: { equalTo: id } },
							skipHooks: true,
						})
					: [{}]

			const objectsToMap = objects.length > 0 ? objects : [newData || {}]

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
								config: context.wibe.config,
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
	{
		operationType: OperationType.BeforeCreate,
		priority: 1,
		callback: defaultCallAuthenticationProviderOnBeforeCreateUser,
	},
	{
		operationType: OperationType.BeforeUpdate,
		priority: 1,
		callback: defaultCallAuthenticationProviderOnBeforeUpdateUser,
	},
	// {
	// 	operationType: OperationType.AfterCreate,
	// 	priority: 1,
	// 	callback: defaultCreateSessionOnAfterCreateUser,
	// },
	// {
	// 	operationType: OperationType.AfterUpdate,
	// 	priority: 1,
	// 	callback: defaultCreateSessionOnAfterUpdateUser,
	// },
]
