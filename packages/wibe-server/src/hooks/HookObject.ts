import { WibeSchemaTypes } from '../../generated/wibe'

export class HookObject<
	T extends keyof WibeSchemaTypes,
	K extends keyof WibeSchemaTypes[T],
> {
	private data: Record<K, WibeSchemaTypes[T][K]>
	public className: T
	public executionTime?: number

	constructor({
		data,
		className,
		executionTime,
	}: {
		className: T
		executionTime?: number
		data: Record<K, WibeSchemaTypes[T][K]>
	}) {
		this.data = data
		this.className = className
		this.executionTime = executionTime
	}

	get({ field }: { field: K }) {
		return this.data[field]
	}

	set({ field, value }: { field: K; value: WibeSchemaTypes[T][K] }) {
		this.data[field] = value
	}

	getData(): Readonly<Record<K, WibeSchemaTypes[T][K]>> {
		return this.data
	}
}
