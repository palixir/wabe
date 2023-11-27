import { Db, Filter, MongoClient, ObjectId, WithId } from 'mongodb'
import {
	AdapterOptions,
	DatabaseAdapter,
	GetObjectOptions,
	CreateObjectOptions,
	UpdateObjectOptions,
	GetObjectsOptions,
	CreateObjectsOptions,
	UpdateObjectsOptions,
} from './adaptersInterface'
import { buildMongoWhereQuery } from './utils'
import { WibeTypes } from '../../../generated/wibe'

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

	async updateObject<T extends keyof WibeTypes>(
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

	async updateObjects<T extends keyof WibeTypes>(
		params: UpdateObjectsOptions<T>,
	) {
		if (!this.database)
			throw new Error('Connection to database is not established')

		const { className, where, data, fields } = params

		const whereBuilded = buildMongoWhereQuery(where)

		const collection = this.database.collection(className)

		const result = await collection.updateMany(whereBuilded, { $set: data })

		const objects = await this.getObjects<T>({
			className,
			where,
			fields,
		})

		if (objects.length !== result.modifiedCount)
			throw new Error('Not all objects were updated')

		return objects
	}

	async createObject<T extends keyof WibeTypes>(
		params: CreateObjectOptions<T>,
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

	async createObjects<T extends keyof WibeTypes>(
		params: CreateObjectsOptions<T>,
	) {
		if (!this.database)
			throw new Error('Connection to database is not established')

		const { className, data, fields } = params

		const collection = this.database.collection(className)

		const res = await collection.insertMany(data, {})

		// TODO : Optimization using OR statement in the query instead of multiple single queries
		const objects = await Promise.all(
			Object.values(res.insertedIds).map((id) => {
				return this.getObject<T>({
					className,
					id: id.toString(),
					fields,
				})
			}),
		)

		return objects
	}

	async getObjects<T extends keyof WibeTypes>(params: GetObjectsOptions<T>) {
		if (!this.database)
			throw new Error('Connection to database is not established')

		const { className, fields, where } = params

		const whereBuilded = buildMongoWhereQuery(where)

		if (fields.includes('*'))
			return this.database
				.collection<any>(className)
				.find(whereBuilded)
				.toArray()

		const objectOfFieldsToGet: Record<any, number> = fields.reduce(
			(acc, prev) => {
				return { ...acc, [prev]: 1 }
			},
			{} as Record<any, number>,
		)

		const collection = this.database.collection<any>(className)

		return collection
			.find(whereBuilded, {
				projection: { ...objectOfFieldsToGet, _id: 1 },
			})
			.toArray()
	}

	async getObject<T extends keyof WibeTypes>(params: GetObjectOptions<T>) {
		if (!this.database)
			throw new Error('Connection to database is not established')

		const { className, id, fields } = params

		if (fields.includes('*'))
			return this.database
				.collection<any>(className)
				.findOne({ _id: new ObjectId(id) } as Filter<any>)

		const objectOfFieldsToGet: Record<any, number> = fields.reduce(
			(acc, prev) => {
				return { ...acc, [prev]: 1 }
			},
			{} as Record<any, number>,
		)

		const collection = this.database.collection<any>(className)

		return collection.findOne({ _id: new ObjectId(id) } as Filter<any>, {
			projection: { ...objectOfFieldsToGet, _id: 1 },
		})
	}
}
