import { type Db, type Filter, MongoClient, ObjectId } from 'mongodb'
import type {
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
	DeleteObjectOptions,
	OutputType,
	CountOptions,
} from './adaptersInterface'
import type { WabeTypes } from '../../server'
import type { WabeContext } from '../../server/interface'

export const buildMongoWhereQuery = <
	T extends keyof WabeTypes['types'],
	K extends keyof WabeTypes['types'][T],
>(
	where?: WhereType<T, K>,
): Record<string, any> => {
	if (!where) return {}

	const objectKeys = Object.keys(where) as Array<keyof WhereType<T, K>>

	return objectKeys.reduce(
		(acc, key) => {
			const value = where[key]

			const keyToWrite = key === 'id' ? '_id' : key

			if (value?.contains) acc[keyToWrite] = { $all: value.contains }
			if (value?.notContains) acc[keyToWrite] = { $ne: value.notContains }
			if (value?.equalTo)
				acc[keyToWrite] =
					keyToWrite === '_id' && typeof value.equalTo === 'string'
						? ObjectId.createFromHexString(value.equalTo)
						: value.equalTo
			if (value?.notEqualTo)
				acc[keyToWrite] = {
					$ne:
						keyToWrite === '_id' && typeof value.notEqualTo === 'string'
							? ObjectId.createFromHexString(value.notEqualTo)
							: value.notEqualTo,
				}

			if (value?.greaterThan) acc[keyToWrite] = { $gt: value.greaterThan }
			if (value?.greaterThanOrEqualTo)
				acc[keyToWrite] = { $gte: value.greaterThanOrEqualTo }

			if (value?.lessThan) acc[keyToWrite] = { $lt: value.lessThan }
			if (value?.lessThanOrEqualTo)
				acc[keyToWrite] = { $lte: value.lessThanOrEqualTo }

			if (value?.in)
				acc[keyToWrite] = {
					$in:
						keyToWrite === '_id'
							? value.in
									.filter((inValue) => typeof inValue === 'string')
									.map((inValue) => ObjectId.createFromHexString(inValue))
							: value.in,
				}
			if (value?.notIn)
				acc[keyToWrite] = {
					$nin:
						keyToWrite === '_id'
							? value.notIn
									.filter((notInValue) => typeof notInValue === 'string')
									.map((notInValue) => ObjectId.createFromHexString(notInValue))
							: value.notIn,
				}

			if (value && keyToWrite === 'OR') {
				acc.$or = where.OR?.map((or) => buildMongoWhereQuery(or))
				return acc
			}

			if (value && keyToWrite === 'AND') {
				acc.$and = where.AND?.map((and) => buildMongoWhereQuery(and))
				return acc
			}

			if (typeof value === 'object') {
				const where = buildMongoWhereQuery(value as WhereType<T, K>)
				const entries = Object.entries(where)

				if (entries.length > 0)
					return {
						[`${keyToWrite.toString()}.${entries[0][0]}`]: entries[0][1],
					}
			}

			return acc
		},
		{} as Record<any, any>,
	)
}

export class MongoAdapter<T extends WabeTypes> implements DatabaseAdapter {
	public options: AdapterOptions
	public database?: Db
	private client: MongoClient

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

	async createClassIfNotExist(
		className: keyof T['types'],
		context: WabeContext<T>,
	) {
		if (!this.database)
			throw new Error('Connection to database is not established')

		const schemaClass = context.wabe.config.schema?.classes?.find(
			(currentClass) => currentClass.name === className,
		)

		if (!schemaClass)
			throw new Error(`${className as string} is not defined in schema`)

		// @ts-expect-error
		const collection = this.database.collection(className)

		const indexes = schemaClass.indexes || []

		indexes.map((index) =>
			collection.createIndex(
				{
					[index.field]: index.order === 'ASC' ? 1 : -1,
				},
				{ unique: !!index.unique },
			),
		)

		return collection
	}

	async count<U extends keyof T['types'], K extends keyof T['types'][U]>(
		params: CountOptions<U, K>,
	) {
		const { className, where, context } = params

		const collection = await this.createClassIfNotExist(className, context)

		const whereBuilded = buildMongoWhereQuery<T, K>(where)

		return collection.countDocuments(whereBuilded)
	}

	async clearDatabase() {
		if (!this.database)
			throw new Error('Connection to database is not established')

		const collections = await this.database.collections()

		await Promise.all(
			collections.map((collection) => collection.deleteMany({})),
		)
	}

	async getObject<U extends keyof T['types'], K extends keyof T['types'][U]>(
		params: GetObjectOptions<U, K>,
	): Promise<OutputType<U, K>> {
		if (!this.database)
			throw new Error('Connection to database is not established')

		const { className, id, fields, where, context } = params

		const whereBuilded = buildMongoWhereQuery<T, K>(where)

		const objectOfFieldsToGet = fields?.reduce(
			(acc, prev) => {
				acc[prev] = 1
				return acc
			},
			{} as Record<any, number>,
		)

		const collection = await this.createClassIfNotExist(className, context)

		const res = await collection.findOne(
			{ _id: new ObjectId(id), ...whereBuilded } as Filter<any>,
			{
				projection:
					fields && fields.length > 0 && !fields.includes('*')
						? { ...objectOfFieldsToGet, _id: 1 }
						: {},
			},
		)

		if (!res) {
			throw new Error('Object not found')
		}

		const { _id, ...resultWithout_Id } = res

		return {
			...resultWithout_Id,
			...{ id: _id.toString() },
		} as OutputType<U, K>
	}

	async getObjects<
		U extends keyof T['types'],
		K extends keyof T['types'][U],
		W extends keyof T['types'][U],
	>(params: GetObjectsOptions<U, K, W>): Promise<OutputType<U, K>[]> {
		if (!this.database)
			throw new Error('Connection to database is not established')

		const { className, fields, where, offset, first, context } = params

		const whereBuilded = buildMongoWhereQuery(where)

		const objectOfFieldsToGet = fields?.reduce(
			(acc, prev) => {
				acc[prev] = 1

				return acc
			},
			{} as Record<any, number>,
		)

		const collection = await this.createClassIfNotExist(className, context)

		const res = await collection
			.find(whereBuilded, {
				projection:
					fields && fields.length > 0 && !fields.includes('*')
						? {
								...objectOfFieldsToGet,
								_id: 1,
							}
						: {},
			})
			.limit(first || 0)
			.skip(offset || 0)
			.toArray()

		return res.map((object) => {
			const { _id, ...resultWithout_Id } = object

			return {
				...resultWithout_Id,
				...{ id: _id.toString() },
			} as OutputType<U, K>
		})
	}

	async createObject<
		U extends keyof T['types'],
		K extends keyof T['types'][U],
		W extends keyof T['types'][U],
	>(params: CreateObjectOptions<U, K, W>): Promise<OutputType<U, K>> {
		if (!this.database)
			throw new Error('Connection to database is not established')

		const { className, data, fields, context } = params

		const collection = await this.createClassIfNotExist(className, context)

		const res = await collection.insertOne(data, {})

		const object = await context.wabe.controllers.database.getObject({
			className,
			id: res.insertedId.toString(),
			context,
			fields,
		})

		return object
	}

	async createObjects<
		U extends keyof T['types'],
		K extends keyof T['types'][U],
		W extends keyof T['types'][U],
	>(params: CreateObjectsOptions<U, K, W>): Promise<OutputType<U, K>[]> {
		if (!this.database)
			throw new Error('Connection to database is not established')

		const { className, data, fields, offset, first, context } = params

		const collection = await this.createClassIfNotExist(className, context)

		const res = await collection.insertMany(data, {})

		const orStatement = Object.entries(res.insertedIds).map(([, value]) => ({
			id: { equalTo: value },
		}))

		const allObjects = await context.wabe.controllers.database.getObjects({
			className,
			where: { OR: orStatement } as WhereType<T, K>,
			fields,
			offset,
			first,
			context,
		})

		return allObjects as OutputType<U, K>[]
	}

	async updateObject<
		U extends keyof T['types'],
		K extends keyof T['types'][U],
		W extends keyof T['types'][U],
	>(params: UpdateObjectOptions<U, K, W>): Promise<OutputType<U, K>> {
		if (!this.database)
			throw new Error('Connection to database is not established')

		const { className, id, data, fields, context, where } = params

		const whereBuilded = where ? buildMongoWhereQuery<T, W>(where) : {}

		const collection = await this.createClassIfNotExist(className, context)

		const res = await collection.updateOne(
			{
				_id: new ObjectId(id),
				...whereBuilded,
			},
			{
				$set: data,
			},
		)

		if (res.matchedCount === 0) throw new Error('Object not found')

		const object = await context.wabe.controllers.database.getObject({
			className,
			context,
			fields,
			id,
		})

		return object
	}

	async updateObjects<
		U extends keyof T['types'],
		K extends keyof T['types'][U],
		W extends keyof T['types'][U],
	>(params: UpdateObjectsOptions<U, K, W>): Promise<OutputType<U, K>[]> {
		if (!this.database)
			throw new Error('Connection to database is not established')

		const { className, where, data, fields, offset, first, context } = params

		const whereBuilded = buildMongoWhereQuery<T, W>(where)

		const collection = await this.createClassIfNotExist(className, context)

		const objectsBeforeUpdate =
			await context.wabe.controllers.database.getObjects({
				className,
				where,
				fields: ['id'],
				offset,
				first,
				context,
			})

		if (objectsBeforeUpdate.length === 0) throw new Error('Object not found')

		await collection.updateMany(whereBuilded, {
			$set: data,
		})

		const orStatement = objectsBeforeUpdate.map((object) => ({
			id: { equalTo: ObjectId.createFromHexString(object.id) },
		}))

		const objects = await context.wabe.controllers.database.getObjects({
			className,
			where: {
				OR: orStatement,
			} as WhereType<T, K>,
			fields,
			offset,
			first,
			context,
		})

		return objects as OutputType<U, K>[]
	}

	async deleteObject<
		U extends keyof T['types'],
		K extends keyof T['types'][U],
		W extends keyof T['types'][U],
	>(params: DeleteObjectOptions<U, K, W>) {
		if (!this.database)
			throw new Error('Connection to database is not established')

		const { className, id, context } = params

		const whereBuilded = buildMongoWhereQuery(params.where)

		const collection = await this.createClassIfNotExist(className, context)

		const res = await collection.deleteOne({
			_id: new ObjectId(id),
			...whereBuilded,
		})

		if (res.deletedCount === 0) throw new Error('Object not found')
	}

	async deleteObjects<
		U extends keyof T['types'],
		K extends keyof T['types'][U],
		W extends keyof T['types'][U],
	>(params: DeleteObjectsOptions<U, K, W>) {
		if (!this.database)
			throw new Error('Connection to database is not established')

		const { className, where, context } = params

		const whereBuilded = buildMongoWhereQuery(where)

		const collection = await this.createClassIfNotExist(className, context)

		await collection.deleteMany(whereBuilded)
	}
}
