import { WibeSchemaTypes } from '../../generated/wibe'
import { HookObject } from './HookObject'
import {
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
	callback: (hookObject: HookObject<T, K>) => Promise<void> | void
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
]
