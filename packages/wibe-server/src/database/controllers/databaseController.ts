import {
	CreateObjectOptions,
	CreateObjectsOptions,
	DatabaseAdapter,
	GetObjectOptions,
	GetObjectsOptions,
	UpdateObjectOptions,
} from '../adapters/adaptersInterface'

export class DatabaseController {
	public adapter: DatabaseAdapter

	constructor(adapter: DatabaseAdapter) {
		this.adapter = adapter
	}

	async connect() {
		return this.adapter.connect()
	}

	async close() {
		return this.adapter.close()
	}

	async createClass(className: string) {
		return this.adapter.createClass(className)
	}

	async getObject<T extends any>(params: GetObjectOptions<T>) {
		return this.adapter.getObject(params)
	}

	async getObjects<T extends any>(params: GetObjectsOptions<T>) {
		return this.adapter.getObjects(params)
	}

	async createObject<T extends any>(params: CreateObjectOptions<T>) {
		return this.adapter.createObject(params)
	}

	async createObjects<T extends any>(params: CreateObjectsOptions<T>) {
		return this.adapter.createObjects(params)
	}

	async updateObject<T extends any>(params: UpdateObjectOptions<T>) {
		return this.adapter.updateObject(params)
	}
}
