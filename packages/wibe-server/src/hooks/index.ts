import type { OutputType, WhereType } from '../database'
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

const _getHooksOrderByPriorities = (config: WibeConfig<any>) =>
	config.hooks
		?.reduce((acc, hook) => {
			if (!acc.includes(hook.priority)) acc.push(hook.priority)

			return acc
		}, [] as number[])
		.sort((a, b) => a - b) || []

export const initializeHook = <T extends keyof WibeAppTypes['types']>({
	className,
	newData,
	context,
	skipHooks,
}: {
	className: T
	newData: TypedNewData<any>
	context: WibeContext<any>
	skipHooks?: boolean
}): {
	runOnSingleObject: (options: {
		operationType: OperationType
		id?: string
		object?: OutputType<any, any>
	}) => Promise<{
		object: OutputType<any, any>
		newData: TypedNewData<any>
	}>
	runOnMultipleObjects: (options: {
		operationType: OperationType
		where?: WhereType<any, any>
		objects?: OutputType<any, any>[]
	}) => Promise<{
		objects: OutputType<any, any>[]
		newData: Array<TypedNewData<any>>
	}>
} => {
	if (skipHooks)
		return {
			// @ts-expect-error
			runOnSingleObject: async () => ({ object: {}, newData: {} }),
			runOnMultipleObjects: async () => ({ objects: [], newData: [{}] }),
		}

	const computeObject = async ({
		id,
		object,
		operationType,
	}: {
		id?: string
		object?: OutputType<any, any>
		operationType: OperationType
	}): Promise<OutputType<any, any>> => {
		if (object) return object

		// @ts-expect-error
		if (operationType === OperationType.BeforeCreate) return newData

		if (!id) throw new Error('Object not found tata')

		return context.wibe.databaseController.getObject({
			// @ts-expect-error
			className,
			context: {
				...context,
				isRoot: true,
			},
			id,
			skipHooks: true,
		})
	}

	const computeObjects = async ({
		objects,
		operationType,
		where,
	}: {
		where?: WhereType<any, any>
		objects?: OutputType<any, any>[]
		operationType: OperationType
	}): Promise<OutputType<any, any>[]> => {
		if (objects) return objects

		// @ts-expect-error
		if (operationType === OperationType.BeforeCreate) return [newData]

		const res = await context.wibe.databaseController.getObjects({
			className,
			context: {
				...context,
				isRoot: true,
			},
			where,
			skipHooks: true,
		})

		// @ts-expect-error
		if (res.length === 0) return [{}]

		return res
	}

	return {
		runOnSingleObject: async ({
			operationType,
			id,
			object: inputObject,
		}: {
			operationType: OperationType
			id?: string
			object?: OutputType<any, any>
		}) => {
			const hooksOrderByPriorities = _getHooksOrderByPriorities(
				context.wibe.config,
			)

			const object = await computeObject({
				id,
				operationType,
				object: inputObject,
			})

			const hookObject = new HookObject({
				className,
				newData,
				operationType,
				context,
				object,
			})

			// We need to keep the order of the data but we need to execute the hooks in parallel
			await hooksOrderByPriorities.reduce(async (acc, priority) => {
				await acc

				const hooksToCompute = await _findHooksByPriority({
					className,
					operationType,
					priority,
					config: context.wibe.config,
				})

				await Promise.all(
					hooksToCompute.map((hook) => hook.callback(hookObject)),
				)
			}, Promise.resolve())

			return { object, newData: hookObject.getNewData() }
		},

		runOnMultipleObjects: async ({
			operationType,
			where,
			objects: inputObjects,
		}: {
			operationType: OperationType
			where?: WhereType<any, any>
			objects?: OutputType<any, any>[]
		}) => {
			const hooksOrderByPriorities = _getHooksOrderByPriorities(
				context.wibe.config,
			)

			const objects = await computeObjects({
				where,
				operationType,
				objects: inputObjects,
			})

			const newDataAfterHooks = await Promise.all(
				objects.map(async (object) => {
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

			return { objects, newData: newDataAfterHooks }
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
