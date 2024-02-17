import { OperationType } from '.'
import { WibeSchemaTypes, _User } from '../../generated/wibe'

export interface ObjectInterface<
	T extends keyof WibeSchemaTypes,
	K extends keyof WibeSchemaTypes[T],
> {
	fields: Record<K, any>
	id?: string
}

export class HookObject<
	T extends keyof WibeSchemaTypes,
	K extends keyof WibeSchemaTypes[T],
> {
	public user: _User
	public className: T
	private object: ObjectInterface<T, K>
	private operationType: OperationType

	constructor({
		object,
		className,
		user,
		operationType,
	}: {
		user: _User
		className: T
		object: ObjectInterface<T, K>
		operationType: OperationType
	}) {
		this.user = user
		this.object = { ...object, fields: Object.assign({}, object.fields) }
		this.className = className
		this.operationType = operationType
	}

	get({ field }: { field: K }) {
		return this.object.fields?.[field]
	}

	set({ field, value }: { field: K; value: any }) {
		if (!this.operationType.includes('before'))
			throw new Error(
				'Cannot set data in a hook that is not a before hook',
			)

		this.object.fields[field] = value
	}

	getObject() {
		return this.object
	}
}
