import {
	ChangeStream,
	ChangeStreamDocument,
	Document,
	Db,
	Filter,
	MongoClient,
	ObjectId,
} from 'mongodb'
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
	DeleteObjectOptions,
} from './adaptersInterface'
import { WibeSchemaTypes } from '../../../generated/wibe'
import { OperationType, findHooksAndExecute } from '../../hooks'

export const buildMongoWhereQuery = <T extends keyof WibeSchemaTypes>(
	where?: WhereType<T>,
): Record<string, any> => {
	if (!where) return {}

	const objectKeys = Object.keys(where) as Array<keyof WhereType<T>>

	return objectKeys.reduce(
		(acc, key) => {
			const value = where[key]

			const keyToWrite = key === 'id' ? '_id' : key

			if (value?.contains) acc[keyToWrite] = value.contains
			if (value?.notContains) acc[keyToWrite] = { $ne: value.notContains }
			if (value?.equalTo) acc[keyToWrite] = value.equalTo
			if (value?.notEqualTo) acc[keyToWrite] = { $ne: value.notEqualTo }

			if (value?.greaterThan) acc[keyToWrite] = { $gt: value.greaterThan }
			if (value?.greaterThanOrEqualTo)
				acc[keyToWrite] = { $gte: value.greaterThanOrEqualTo }

			if (value?.lessThan) acc[keyToWrite] = { $lt: value.lessThan }
			if (value?.lessThanOrEqualTo)
				acc[keyToWrite] = { $lte: value.lessThanOrEqualTo }

			if (value?.in) acc[keyToWrite] = { $in: value.in }
			if (value?.notIn) acc[keyToWrite] = { $nin: value.notIn }

			if (value && keyToWrite === 'OR') {
				acc.$or = where.OR?.map((or) => buildMongoWhereQuery(or))
				return acc
			}

			if (value && keyToWrite === 'AND') {
				acc.$and = where.AND?.map((and) => buildMongoWhereQuery(and))
				return acc
			}

			if (typeof value === 'object') {
				const where = buildMongoWhereQuery(value as WhereType<T>)
				const entries = Object.entries(where)

				if (entries.length > 0)
					return {
						[`${keyToWrite.toString()}.${entries[0][0]}`]:
							entries[0][1],
					}
			}

			return acc
		},
		{} as Record<any, any>,
	)
}

export class MongoAdapter implements DatabaseAdapter {
	public options: AdapterOptions
	public database?: Db
	private client: MongoClient
	private streams: Array<
		ChangeStream<Document, ChangeStreamDocument<Document>>
	> = []

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
		for (const stream of this.streams) {
			stream.close()
		}

		return this.client.close()
	}

	async createClassIfNotExist(className: string) {
		if (!this.database)
			throw new Error('Connection to database is not established')

		const collection = this.database.collection(className)

		return collection
	}

	async getObject<
		T extends keyof WibeSchemaTypes,
		K extends keyof WibeSchemaTypes[T],
	>(
		params: GetObjectOptions<T, K>,
	): Promise<Pick<WibeSchemaTypes[T], K> | null> {
		if (!this.database)
			throw new Error('Connection to database is not established')

		const { className, id, fields } = params

		const objectOfFieldsToGet = fields?.reduce(
			(acc, prev) => {
				acc[prev] = 1
				return acc
			},
			{} as Record<any, number>,
		)

		// @ts-expect-error
		const isIdInProjection = fields?.includes('id') || !fields

		const collection = await this.createClassIfNotExist(className)

		const res = await collection.findOne(
			{ _id: new ObjectId(id) } as Filter<any>,
			{
				projection: fields
					? { ...objectOfFieldsToGet, _id: isIdInProjection }
					: {},
			},
		)

		if (!res) return null

		const { _id, ...resultWithout_Id } = res

		return {
			...resultWithout_Id,
			...(isIdInProjection ? { id: _id.toString() } : undefined),
		} as Pick<WibeSchemaTypes[T], K>
	}

	async getObjects<
		T extends keyof WibeSchemaTypes,
		K extends keyof WibeSchemaTypes[T],
	>(params: GetObjectsOptions<T, K>): Promise<Pick<WibeSchemaTypes[T], K>[]> {
		if (!this.database)
			throw new Error('Connection to database is not established')

		const { className, fields, where, offset, limit } = params

		const whereBuilded = buildMongoWhereQuery<T>(where)

		const objectOfFieldsToGet = fields?.reduce(
			(acc, prev) => {
				acc[prev] = 1

				return acc
			},
			{} as Record<any, number>,
		)

		// @ts-expect-error
		const isIdInProjection = fields?.includes('id') || !fields

		const collection = await this.createClassIfNotExist(className)

		const res = await collection
			.find(whereBuilded, {
				projection: fields
					? {
							...objectOfFieldsToGet,
					  }
					: {},
			})
			.limit(limit || 0)
			.skip(offset || 0)
			.toArray()

		return res.map((object) => {
			const { _id, ...resultWithout_Id } = object

			return {
				...resultWithout_Id,
				...(isIdInProjection ? { id: _id.toString() } : undefined),
			} as Pick<WibeSchemaTypes[T], K>
		})
	}

	async createObject<
		T extends keyof WibeSchemaTypes,
		K extends keyof WibeSchemaTypes[T],
		W extends keyof WibeSchemaTypes[T],
	>(
		params: CreateObjectOptions<T, K, W>,
	): Promise<Pick<WibeSchemaTypes[T], K>> {
		if (!this.database)
			throw new Error('Connection to database is not established')

		const { className, data, fields, context } = params

		const res = await this.createObjects({
			className,
			data: [data],
			fields,
			context,
		})

		return res[0]
	}

	async createObjects<
		T extends keyof WibeSchemaTypes,
		K extends keyof WibeSchemaTypes[T],
		W extends keyof WibeSchemaTypes[T],
	>(
		params: CreateObjectsOptions<T, K, W>,
	): Promise<Pick<WibeSchemaTypes[T], K>[]> {
		if (!this.database)
			throw new Error('Connection to database is not established')

		const { className, data, fields, offset, limit, context } = params

		const collection = await this.createClassIfNotExist(className)

		const arrayOfComputedData = await findHooksAndExecute({
			className,
			data,
			user: context.user,
			operationType: OperationType.BeforeInsert,
		})

		const res = await collection.insertMany(arrayOfComputedData, {})

		const orStatement = Object.entries(res.insertedIds).map(
			([, value]) => ({
				id: { equalTo: value },
			}),
		)

		return this.getObjects({
			className,
			where: { OR: orStatement } as WhereType<T>,
			fields,
			offset,
			limit,
		})
	}

	async updateObject<
		T extends keyof WibeSchemaTypes,
		K extends keyof WibeSchemaTypes[T],
		W extends keyof WibeSchemaTypes[T],
	>(
		params: UpdateObjectOptions<T, K, W>,
	): Promise<Pick<WibeSchemaTypes[T], K>> {
		if (!this.database)
			throw new Error('Connection to database is not established')

		const { className, id, data, fields, context } = params

		const res = await this.updateObjects({
			className,
			where: { id: { equalTo: new ObjectId(id) } } as WhereType<T>,
			data,
			fields,
			context,
		})

		return res[0]
	}

	async updateObjects<
		T extends keyof WibeSchemaTypes,
		K extends keyof WibeSchemaTypes[T],
		W extends keyof WibeSchemaTypes[T],
	>(
		params: UpdateObjectsOptions<T, K, W>,
	): Promise<Pick<WibeSchemaTypes[T], K>[]> {
		if (!this.database)
			throw new Error('Connection to database is not established')

		const { className, where, data, fields, offset, limit, context } =
			params

		const whereBuilded = buildMongoWhereQuery<T>(where)

		const collection = await this.createClassIfNotExist(className)

		const arrayOfComputedData = await findHooksAndExecute({
			className,
			user: context.user,
			data: [data],
			operationType: OperationType.BeforeUpdate,
		})

		const objectsBeforeUpdate = await this.getObjects({
			className,
			where,
			fields: ['id'],
			offset,
			limit,
		})

		await collection.updateMany(whereBuilded, {
			$set: arrayOfComputedData[0],
		})

		const orStatement = objectsBeforeUpdate.map((object) => ({
			id: { equalTo: new ObjectId(object.id) },
		}))

		return this.getObjects({
			className,
			where: {
				OR: orStatement,
			} as WhereType<T>,
			fields,
			offset,
			limit,
		})
	}

	async deleteObject<
		T extends keyof WibeSchemaTypes,
		K extends keyof WibeSchemaTypes[T],
	>(
		params: DeleteObjectOptions<T, K>,
	): Promise<Pick<WibeSchemaTypes[T], K> | null> {
		if (!this.database)
			throw new Error('Connection to database is not established')

		const { className, id, fields, context } = params

		const res = await this.deleteObjects({
			className,
			where: { id: { equalTo: new ObjectId(id) } } as WhereType<T>,
			fields,
			context,
		})

		return res.length === 1 ? res[0] : null
	}

	async deleteObjects<
		T extends keyof WibeSchemaTypes,
		K extends keyof WibeSchemaTypes[T],
	>(
		params: DeleteObjectsOptions<T, K>,
	): Promise<Pick<WibeSchemaTypes[T], K>[]> {
		if (!this.database)
			throw new Error('Connection to database is not established')

		const { className, where, fields, limit, offset, context } = params

		const whereBuilded = buildMongoWhereQuery(where)

		const collection = await this.createClassIfNotExist(className)

		const objectsBeforeDelete = await this.getObjects({
			className,
			where,
			fields,
			limit,
			offset,
		})

		await findHooksAndExecute({
			className,
			user: context.user,
			data: [],
			operationType: OperationType.BeforeDelete,
		})

		await collection.deleteMany(whereBuilded)

		return objectsBeforeDelete
	}
}
