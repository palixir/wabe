import { Db, Filter, MongoClient, ObjectId, WithId } from 'mongodb'
import { AdapterOptions } from '../adaptersInterface'
import { NexusGenObjects } from '../../../generated/nexusTypegen'

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

	async updateObject(params: {
		className: string
		id: string
		data: Record<string, any>
	}) {
		if (!this.database)
			throw new Error('Connection to database is not established')

		const { className, id, data } = params

		const collection = this.database.collection(className)

		const result = await collection.updateOne(
			{ _id: new ObjectId(id) },
			{ $set: data },
		)

		if (!result.matchedCount) throw new Error('Object not found')

		return result
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

	async getObject<T extends keyof NexusGenObjects>(params: {
		className: string
		id: string
		fields: Array<keyof NexusGenObjects[T]>
	}) {
		if (!this.database)
			throw new Error('Connection to database is not established')

		const { className, id, fields } = params

		const objectOfFieldsToGet = fields.reduce((acc, prev) => {
			return { ...acc, [prev]: 1 }
		}, {})

		const collection =
			this.database.collection<NexusGenObjects[T]>(className)

		const res = await collection.findOne(
			{ _id: new ObjectId(id) } as Filter<NexusGenObjects[T]>,
			{
				projection: objectOfFieldsToGet,
			},
		)

		if (!res) throw new Error('Object not found')

		return res
	}
}
