import { OperationType } from '.'
import { WibeSchemaTypes, _User } from '../../generated/wibe'

export class HookObject<
	T extends keyof WibeSchemaTypes,
	K extends keyof WibeSchemaTypes[T],
> {
	public user: _User
	public className: T
	private data?: Record<K, any>
	private operationType: OperationType

	constructor({
		data,
		className,
		user,
		operationType,
	}: {
		user: _User
		className: T
		data: Record<K, any>
		operationType: OperationType
	}) {
		this.user = user
		this.data = Object.assign({}, data)
		this.className = className
		this.operationType = operationType
	}

	get({ field }: { field: K }) {
		return this.data?.[field]
	}

	set({ field, value }: { field: K; value: any }) {
		if (!this.operationType.includes('before'))
			throw new Error(
				'Cannot set data in a hook that is not a before hook',
			)

		if (!this.data) return

		this.data[field] = value
	}

	getData() {
		return this.data
	}
}
