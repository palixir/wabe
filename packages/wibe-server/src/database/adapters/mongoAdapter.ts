import { Db, Filter, MongoClient, ObjectId } from 'mongodb'
import {
	AdapterOptions,
	DatabaseAdapter,
	GetObjectOptions,
	CreateObjectOptions,
	UpdateObjectOptions,
	GetObjectsOptions,
	CreateObjectsOptions,
	UpdateObjectsOptions,
	DeleteObjectsOptions,
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

		const objectsBeforeUpdate = await this.getObjects<T>({
			className,
			where,
			fields: ['id'],
		})

		await collection.updateMany(whereBuilded, { $set: data })

		const objects = await Promise.all(
			objectsBeforeUpdate.map((object) =>
				this.getObject<T>({
					className,
					id: object.id,
					fields,
				}),
			),
		)

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

		if (fields.includes('*')) {
			const res = await this.database
				.collection<any>(className)
				.find(whereBuilded)
				.toArray()

			// We standardize the id field
			res.forEach((object) => {
				if (object._id) {
					object.id = object._id.toString()
					delete object['_id']
				}
			})

			return res
		}

		const objectOfFieldsToGet: Record<any, number> = fields.reduce(
			(acc, prev) => {
				return { ...acc, [prev]: 1 }
			},
			{} as Record<any, number>,
		)

		const collection = this.database.collection<any>(className)

		const isIdInProjection = fields.includes('id')

		const res = await collection
			.find(whereBuilded, {
				projection: { ...objectOfFieldsToGet, _id: isIdInProjection },
			})
			.toArray()

		// We standardize the id field
		res.forEach((object) => {
			if (object._id) {
				object.id = object._id.toString()
				delete object['_id']
			}
		})

		return res
	}

	async getObject<T extends keyof WibeTypes>(params: GetObjectOptions<T>) {
		if (!this.database)
			throw new Error('Connection to database is not established')

		const { className, id, fields } = params

		if (fields.includes('*')) {
			const res = await this.database
				.collection<any>(className)
				.findOne({ _id: new ObjectId(id) } as Filter<any>)

			// We standardize the id field
			if (res._id) {
				res.id = res._id.toString()
				delete res['_id']
			}

			return res
		}

		const objectOfFieldsToGet: Record<any, number> = fields.reduce(
			(acc, prev) => {
				return { ...acc, [prev]: 1 }
			},
			{} as Record<any, number>,
		)

		const isIdInProjection = fields.includes('id')

		const collection = this.database.collection<any>(className)

		const res = await collection.findOne(
			{ _id: new ObjectId(id) } as Filter<any>,
			{
				projection: { ...objectOfFieldsToGet, _id: isIdInProjection },
			},
		)

		// We standardize the id field
		if (res && res._id) {
			res.id = res._id.toString()
			delete res['_id']
		}

		return res
	}

	async deleteObject<T extends keyof WibeTypes>(params: GetObjectOptions<T>) {
		if (!this.database)
			throw new Error('Connection to database is not established')

		const { className, id, fields } = params

		const collection = this.database.collection(className)

		const objectToReturn = this.getObject<T>({
			className,
			id,
			fields,
		})

		const res = await collection.deleteOne({
			_id: new ObjectId(id),
		} as Filter<any>)

		if (res.deletedCount === 0)
			throw new Error('Object not found for deletion')

		return objectToReturn
	}

	async deleteObjects<T extends keyof WibeTypes>(
		params: DeleteObjectsOptions<T>,
	) {
		if (!this.database)
			throw new Error('Connection to database is not established')

		const { className, where, fields } = params

		const whereBuilded = buildMongoWhereQuery(where)

		const collection = this.database.collection(className)

		const objectsBeforeDelete = await this.getObjects<T>({
			className,
			where,
			fields,
		})

		await collection.deleteMany(whereBuilded)

		return objectsBeforeDelete
	}
}
