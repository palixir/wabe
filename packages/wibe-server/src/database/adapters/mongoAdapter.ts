import { Db, MongoClient } from 'mongodb'
import { AdapterOptions, DatabaseAdapter } from '.'
export class MongoAdapter extends DatabaseAdapter {
	private options: AdapterOptions
	private client: MongoClient
	public database?: Db

	constructor(options: AdapterOptions) {
		super()
		this.options = options
		this.client = new MongoClient(options.databaseUrl)
	}

	async connect() {
		const client = await this.client.connect()
		this.database = client.db(this.options.databaseName)

		return client
	}

	async createClass(className: string) {
		if (!this.database)
			throw new Error('Connection to database is not established')

		await this.database.createCollection(className)
	}
}
