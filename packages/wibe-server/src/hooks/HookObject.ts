import type { OperationType, TypedNewData } from '.'
import type { WibeAppTypes } from '../server'
import type { Context } from '../server/interface'

export class HookObject<T extends keyof WibeAppTypes['types']> {
	public className: T
	private newData: TypedNewData<T>
	private operationType: OperationType
	public context: Context
	public object: Record<keyof WibeAppTypes['types'][T], any>

	constructor({
		newData,
		className,
		operationType,
		context,
		object,
	}: {
		className: T
		newData: TypedNewData<T>
		operationType: OperationType
		context: Context
		object: Record<keyof WibeAppTypes['types'][T], any>
	}) {
		this.newData = newData
		this.className = className
		this.operationType = operationType
		this.context = context
		this.object = object
	}

	getUser() {
		return this.context.user
	}

	isFieldUpdate(field: keyof WibeAppTypes['types'][T]) {
		return this.newData && !!this.newData[field]
	}

	upsertNewData(field: keyof WibeAppTypes['types'][T], value: any) {
		if (!this.newData) return

		if (!this.operationType.includes('before'))
			throw new Error(
				'Cannot set data in a hook that is not a before hook',
			)

		this.newData[field] = value
	}

	getNewData(): Record<keyof WibeAppTypes['types'][T], any> {
		return this.newData || ({} as any)
	}
}
