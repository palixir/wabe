import { Document, WithId } from 'mongodb'
import {
	DatabaseAdapter,
	GetObjectOptions,
	InsertObjectOptions,
	UpdateObjectOptions,
} from '../adapters/adaptersInterface'
import { NexusGenObjects } from '../../../generated/nexusTypegen'

export class DatabaseController {
	private adapter: DatabaseAdapter

	constructor(adapter: DatabaseAdapter) {
		this.adapter = adapter
	}

	async connect() {
		return this.adapter.connect()
	}

	async createClass(className: string) {
		return this.adapter.createClass(className)
	}

	async getObject<T extends keyof NexusGenObjects>(
		params: GetObjectOptions<T>,
	): Promise<WithId<Document>> {
		return this.adapter.getObject(params)
	}

	async insertObject(params: InsertObjectOptions) {
		return this.adapter.insertObject(params)
	}

	async updateObject(params: UpdateObjectOptions) {
		return this.adapter.updateObject(params)
	}
}
