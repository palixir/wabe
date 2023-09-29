import { DatabaseAdapter } from '../adapters'

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
}
