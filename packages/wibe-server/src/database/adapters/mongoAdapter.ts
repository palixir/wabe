import { Db, Filter, MongoClient, ObjectId, WithId } from 'mongodb'
import {
	AdapterOptions,
	DatabaseAdapter,
	GetObjectOptions,
	InsertObjectOptions,
	UpdateObjectOptions,
} from './adaptersInterface'
import { NexusGenObjects } from '../../../generated/nexusTypegen'

export class MongoAdapter implements DatabaseAdapter {
	public options: AdapterOptions
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

	async updateObject<T extends keyof NexusGenObjects>(
		params: UpdateObjectOptions<T>,
	) {
		if (!this.database)
			throw new Error('Connection to database is not established')

		const { className, id, data, fields } = params

		const collection = this.database.collection(className)

		const result = await collection.findOneAndUpdate(
			{ _id: new ObjectId(id) },
			{ $set: data },
		)

		if (!result) throw new Error('Object not found')

		return this.getObject<T>({
			className,
			id: result._id.toString(),
			fields,
		})
	}

	async insertObject<T extends keyof NexusGenObjects>(
		params: InsertObjectOptions<T>,
	) {
		if (!this.database)
			throw new Error('Connection to database is not established')

		const { className, data, fields } = params

		const collection = this.database.collection(className)

		const result = await collection.insertOne(data)

		return this.getObject<T>({
			className,
			id: result.insertedId.toString(),
			fields,
		})
	}

	async getObject<T extends keyof NexusGenObjects>(
		params: GetObjectOptions<T>,
	) {
		if (!this.database)
			throw new Error('Connection to database is not established')

		const { className, id, fields } = params

		if (fields.includes('*'))
			return this.database
				.collection<NexusGenObjects[T]>(className)
				.findOne({ _id: new ObjectId(id) } as Filter<
					NexusGenObjects[T]
				>)

		const objectOfFieldsToGet: Record<keyof NexusGenObjects[T], number> =
			fields.reduce(
				(acc, prev) => {
					return { ...acc, [prev]: 1 }
				},
				{} as Record<keyof NexusGenObjects[T], number>,
			)

		const collection =
			this.database.collection<NexusGenObjects[T]>(className)

		return collection.findOne(
			{ _id: new ObjectId(id) } as Filter<NexusGenObjects[T]>,
			{
				projection: { ...objectOfFieldsToGet, _id: 1 },
			},
		)
	}
}
