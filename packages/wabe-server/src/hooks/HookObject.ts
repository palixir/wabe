import type { OperationType } from '.'
import type { MutationData } from '../database'
import type { WabeAppTypes } from '../server'
import type { WabeContext } from '../server/interface'

export class HookObject<T extends WabeAppTypes, K = keyof T['types']> {
	public className: string
	private newData: MutationData<T> | undefined
	private operationType: OperationType
	public context: WabeContext<T>
	public object: Record<keyof WabeAppTypes['types'][T], any>

	constructor({
		newData,
		className,
		operationType,
		context,
		object,
	}: {
		className: K
		newData?: MutationData<T>
		operationType: OperationType
		context: WabeContext<T>
		object: Record<keyof WabeAppTypes['types'][T], any>
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

	isFieldUpdate(field: keyof WabeAppTypes['types'][T]) {
		return this.newData && !!this.newData[field]
	}

	upsertNewData(field: keyof WabeAppTypes['types'][T], value: any) {
		if (!this.newData) return

		if (!this.operationType.includes('before'))
			throw new Error(
				'Cannot set data in a hook that is not a before hook',
			)

		this.newData[field] = value
	}

	getNewData(): MutationData<T> {
		return this.newData || ({} as any)
	}
}
