import type { OperationType } from '.'
import type { WibeSchemaTypes } from '../../generated/wibe'

export class HookObject<T extends keyof WibeSchemaTypes> {
	public className: T
	private object: Record<keyof WibeSchemaTypes[T], any>
	private operationType: OperationType

	constructor({
		object,
		className,
		operationType,
	}: {
		className: T
		object: Record<keyof WibeSchemaTypes[T], any>
		operationType: OperationType
	}) {
		this.object = Object.assign({}, object)
		this.className = className
		this.operationType = operationType
	}

	get(field: keyof WibeSchemaTypes[T]) {
		return this.object?.[field]
	}

	set({ field, value }: { field: keyof WibeSchemaTypes[T]; value: any }) {
		if (!this.operationType.includes('before'))
			throw new Error(
				'Cannot set data in a hook that is not a before hook',
			)

		this.object[field] = value
	}

	getObject() {
		return this.object
	}
}
