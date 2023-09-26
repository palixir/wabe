import { Db, MongoClient } from 'mongodb'
import { AdapterOptions } from '.'
import { Schema } from '../../schema'

export class MongoAdapter {
	private options: AdapterOptions
	private client: MongoClient
	private connectionPromise?: Promise<MongoClient>
	private database?: Db

	constructor(options: AdapterOptions) {
		this.options = options
		this.client = new MongoClient(options.databaseUrl)
	}

	async connect() {
		if (this.connectionPromise) return this.connectionPromise

		this.connectionPromise = this.client.connect().then((client) => {
			this.database = client.db(this.options.databaseName)
			return client
		})
	}

	async fillDatabase(schema: Schema) {
		this.database.collection('schema').insertOne(schema)
	}
}
