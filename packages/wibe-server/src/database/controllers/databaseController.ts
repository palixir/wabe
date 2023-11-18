import { Document, WithId } from 'mongodb'
import {
	CreateObjectOptions,
	CreateObjectsOptions,
	DatabaseAdapter,
	GetObjectOptions,
	GetObjectsOptions,
	UpdateObjectOptions,
} from '../adapters/adaptersInterface'
import { NexusGenObjects } from '../../../generated/nexusTypegen'

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

	async getObject<T extends keyof NexusGenObjects>(
		params: GetObjectOptions<T>,
	) {
		return this.adapter.getObject(params)
	}

	async getObjects<T extends keyof NexusGenObjects>(
		params: GetObjectsOptions<T>,
	) {
		return this.adapter.getObjects(params)
	}

	async createObject<T extends keyof NexusGenObjects>(
		params: CreateObjectOptions<T>,
	) {
		return this.adapter.createObject(params)
	}

	async createObjects<T extends keyof NexusGenObjects>(
		params: CreateObjectsOptions<T>,
	) {
		return this.adapter.createObjects(params)
	}

	async updateObject<T extends keyof NexusGenObjects>(
		params: UpdateObjectOptions<T>,
	) {
		return this.adapter.updateObject(params)
	}
}
