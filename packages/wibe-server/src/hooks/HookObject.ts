import type { OperationType } from '.'
import type { WibeSchemaTypes } from '../../generated/wibe'
import type { Context } from '../graphql/interface'
import { notEmpty } from '../utils/helper'

type TypedNewData<T extends keyof WibeSchemaTypes> = Array<
	Record<keyof WibeSchemaTypes[T], any>
>

export class HookObject<T extends keyof WibeSchemaTypes> {
	public className: T
	private newDatas: TypedNewData<T>
	private operationType: OperationType
	private context: Context

	constructor({
		newDatas,
		className,
		operationType,
		context,
	}: {
		className: T
		newDatas: TypedNewData<T>
		operationType: OperationType
		context: Context
	}) {
		this.newDatas = newDatas
		this.className = className
		this.operationType = operationType
		this.context = context
	}

	getUser() {
		return this.context.user
	}

	get(field: keyof WibeSchemaTypes[T]) {
		return this.newDatas.map((newData) => newData[field]).filter(notEmpty)
	}

	set(field: keyof WibeSchemaTypes[T], value: any) {
		if (!this.operationType.includes('before'))
			throw new Error(
				'Cannot set data in a hook that is not a before hook',
			)

		const newArrayOfData = this.newDatas.map((newData) => ({
			...newData,
			[field]: value,
		}))

		this.newDatas = newArrayOfData
	}
}
