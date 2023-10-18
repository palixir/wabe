import { DatabaseAdapter } from '../adaptersInterface'

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

	async getObject(params: {
		className: string
		id: string
		fields: Record<string, any>
	}) {
		return this.adapter.getObject(params)
	}

	async insertObject(params: {
		className: string
		data: Record<string, any>
	}) {
		return this.adapter.insertObject(params)
	}

	async updateObject(params: {
		className: string
		id: string
		data: Record<string, any>
	}) {
		return this.adapter.updateObject(params)
	}
}
