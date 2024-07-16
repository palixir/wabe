export interface InMemoryCacheOptions {
	/**
	 * Interval in ms to clear the cache
	 */
	interval: number
}

/**
 * InMemoryCache is a class that stores data for a certain amount of time
 */
export class InMemoryCache<T> {
	private options: InMemoryCacheOptions
	private store: Record<string, any>

	public intervalId: Timer | undefined = undefined

	constructor(options: InMemoryCacheOptions) {
		this.options = options
		this.store = {}

		this._init()
	}

	_init() {
		this.intervalId = setInterval(() => {
			this.clear()
		}, this.options.interval)
	}

	set(key: string, value: T) {
		this.store[key] = value
	}

	get(key: string): T | undefined {
		return this.store[key]
	}

	clear() {
		this.store = {}
	}

	stop() {
		clearInterval(this.intervalId)
	}
}
