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
	WhereType,
} from './adaptersInterface'
import { WibeSchemaTypes } from '../../../generated/wibe'

export const buildMongoWhereQuery = <T extends keyof WibeSchemaTypes>(
	where?: WhereType<T>,
): Record<string, any> => {
	if (!where) return {}

	const objectKeys = Object.keys(where) as Array<keyof WhereType<T>>

	return objectKeys.reduce(
		(acc, key) => {
			const value = where[key]

			if (value?.contains) acc[key] = value.contains
			if (value?.notContains) acc[key] = { $ne: value.notContains }
			if (value?.equalTo) acc[key] = value.equalTo
			if (value?.notEqualTo) acc[key] = { $ne: value.notEqualTo }

			if (value?.greaterThan) acc[key] = { $gt: value.greaterThan }
			if (value?.greaterThanOrEqualTo)
				acc[key] = { $gte: value.greaterThanOrEqualTo }

			if (value?.lessThan) acc[key] = { $lt: value.lessThan }
			if (value?.lessThanOrEqualTo)
				acc[key] = { $lte: value.lessThanOrEqualTo }

			if (value?.in) acc[key] = { $in: value.in }
			if (value?.notIn) acc[key] = { $nin: value.notIn }

			if (value && key === 'OR')
				acc.$or = where.OR?.map((or) => buildMongoWhereQuery(or))

			if (value && key === 'AND')
				acc.$and = where.AND?.map((and) => buildMongoWhereQuery(and))

			return acc
		},
		{} as Record<any, any>,
	)
}

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

	async updateObject<T extends keyof WibeSchemaTypes>(
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

	async updateObjects<T extends keyof WibeSchemaTypes>(
		params: UpdateObjectsOptions<T>,
	) {
		if (!this.database)
			throw new Error('Connection to database is not established')

		const { className, where, data, fields } = params

		const whereBuilded = buildMongoWhereQuery<T>(where)

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

	async createObject<T extends keyof WibeSchemaTypes>(
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

	async createObjects<T extends keyof WibeSchemaTypes>(
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

	async getObjects<T extends keyof WibeSchemaTypes>(
		params: GetObjectsOptions<T>,
	) {
		if (!this.database)
			throw new Error('Connection to database is not established')

		const { className, fields, where } = params

		const whereBuilded = buildMongoWhereQuery<T>(where)

		if (fields.includes('*')) {
			const res = await this.database
				.collection<any>(className)
				.find(whereBuilded)
				.toArray()

			// We standardize the id field
			for (const object of res) {
				if (object._id) {
					object.id = object._id.toString()
					object._id = undefined
				}
			}

			return res
		}

		const objectOfFieldsToGet: Record<any, number> = fields.reduce(
			(acc, prev) => {
				acc[prev] = 1

				return acc
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
		for (const object of res) {
			if (object._id) {
				object.id = object._id.toString()
				object._id = undefined
			}
		}

		return res
	}

	async getObject<T extends keyof WibeSchemaTypes>(
		params: GetObjectOptions<T>,
	) {
		if (!this.database)
			throw new Error('Connection to database is not established')

		const { className, id, fields } = params

		if (fields.includes('*')) {
			const res = await this.database
				.collection<any>(className)
				.findOne({ _id: new ObjectId(id) } as Filter<any>)

			// We standardize the id field
			if (res?._id) {
				res.id = res._id.toString()
				res._id = undefined
			}

			return res
		}

		const objectOfFieldsToGet: Record<any, number> = fields.reduce(
			(acc, prev) => {
				acc[prev] = 1
				return acc
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
		if (res?._id) {
			res.id = res._id.toString()
			res._id = undefined
		}

		return res
	}

	async deleteObject<T extends keyof WibeSchemaTypes>(
		params: GetObjectOptions<T>,
	) {
		if (!this.database)
			throw new Error('Connection to database is not established')

		const { className, id, fields } = params

		const collection = this.database.collection(className)

		const objectToReturn = await this.getObject<T>({
			className,
			id,
			fields,
		})

		await collection.deleteOne({
			_id: new ObjectId(id),
		} as Filter<any>)

		return objectToReturn
	}

	async deleteObjects<T extends keyof WibeSchemaTypes>(
		params: DeleteObjectsOptions<T>,
	) {
		if (!this.database)
			throw new Error('Connection to database is not established')

		const { className, where, fields } = params

		const whereBuilded = buildMongoWhereQuery<T>(where)

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
