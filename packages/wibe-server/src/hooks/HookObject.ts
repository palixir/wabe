import type { OperationType, TypedNewData } from '.'
import type { WibeAppTypes } from '../server'
import type { WibeContext } from '../server/interface'

export class HookObject<T extends WibeAppTypes, K = keyof T['types']> {
	public className: string
	private newData?: TypedNewData<K>
	private operationType: OperationType
	public context: WibeContext<T>
	public object: Record<keyof WibeAppTypes['types'][T], any>

	constructor({
		newData,
		className,
		operationType,
		context,
		object,
	}: {
		className: K
		newData?: TypedNewData<K>
		operationType: OperationType
		context: WibeContext<T>
		object: Record<keyof WibeAppTypes['types'][T], any>
	}) {
		this.newData = newData
		// We need to cast the className to use it in comparaison
		// @ts-expect-error
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

	getNewData(): TypedNewData<T> {
		return this.newData || ({} as any)
	}
}
