import { Db, MongoClient, ObjectId } from 'mongodb'
import { AdapterOptions } from '.'

export class MongoAdapter {
	private options: AdapterOptions
	private client: MongoClient
	public database?: Db

	constructor(options: AdapterOptions) {
		this.options = options
		this.client = new MongoClient(options.databaseUrl)
	}

	async connect() {
		const client = await this.client.connect()
		this.database = client.db(this.options.databaseName)

		return client
	}

	async close() {
		return this.client.close()
	}

	async createClass(className: string) {
		if (!this.database)
			throw new Error('Connection to database is not established')

		await this.database.createCollection(className)
	}

	async insertObject(params: {
		className: string
		data: Record<string, any>
	}) {
		if (!this.database)
			throw new Error('Connection to database is not established')

		const { className, data } = params

		const collection = this.database.collection(className)

		const result = await collection.insertOne(data)

		return result.insertedId
	}

	async getObject(params: {
		className: string
		id: string
		fields: Array<string>
	}) {
		if (!this.database)
			throw new Error('Connection to database is not established')

		const { className, id, fields } = params

		const collection = this.database.collection(className)

		const res = await collection.findOne({ _id: new ObjectId(id) })

		if (!res) throw new Error('Object not found')

		return fields.reduce((acc, prev) => {
			return { ...acc, [prev]: res[prev] }
		}, {})
	}
}
