import { type Db, type Filter, MongoClient, ObjectId } from 'mongodb'
import pRetry from 'p-retry'
import {
  type AdapterOptions,
  type DatabaseAdapter,
  type GetObjectOptions,
  type CreateObjectOptions,
  type UpdateObjectOptions,
  type GetObjectsOptions,
  type CreateObjectsOptions,
  type UpdateObjectsOptions,
  type DeleteObjectsOptions,
  type WhereType,
  type DeleteObjectOptions,
  type OutputType,
  type CountOptions,
  type OrderType,
  type WabeTypes,
  contextWithRoot,
  notEmpty,
  type SchemaInterface,
} from 'wabe'

export const buildMongoOrderQuery = <
  T extends WabeTypes,
  K extends keyof T['types'],
  U extends keyof T['types'][K],
>(
  order?: OrderType<T, K, U>,
): Record<string, any> => {
  if (!order) return {}

  const objectKeys = Object.keys(order) as Array<keyof OrderType<T, K, U>>

  return objectKeys.reduce(
    (acc, key) => {
      const value = order[key]

      if (value === 'ASC') acc[key] = 1
      if (value === 'DESC') acc[key] = -1

      return acc
    },
    {} as Record<any, number>,
  )
}

export const buildMongoWhereQuery = <
  T extends WabeTypes,
  K extends keyof T['types'],
>(
  where?: WhereType<T, K>,
): Record<string, any> => {
  if (!where) return {}

  const objectKeys = Object.keys(where) as Array<keyof WhereType<T, K>>

  return objectKeys.reduce(
    (acc, key) => {
      const value = where[key]

      const keyToWrite = key === 'id' ? '_id' : key

      if (value?.contains || value?.contains === null)
        acc[keyToWrite] = {
          ...(typeof value.contains === 'object' &&
          !Array.isArray(value.contains)
            ? { $elemMatch: value.contains }
            : {
                $all: Array.isArray(value.contains)
                  ? value.contains
                  : [value.contains],
              }),
        }
      if (value?.notContains || value?.notContains === null)
        acc[keyToWrite] = { $ne: value.notContains }
      if (value?.equalTo || value?.equalTo === null)
        acc[keyToWrite] =
          keyToWrite === '_id' && typeof value.equalTo === 'string'
            ? ObjectId.createFromHexString(value.equalTo)
            : value.equalTo
      if (value?.notEqualTo || value?.notEqualTo === null)
        acc[keyToWrite] = {
          $ne:
            keyToWrite === '_id' && typeof value.notEqualTo === 'string'
              ? ObjectId.createFromHexString(value.notEqualTo)
              : value.notEqualTo,
        }

      if (value?.greaterThan || value?.greaterThan === null)
        acc[keyToWrite] = { $gt: value.greaterThan }
      if (value?.greaterThanOrEqualTo || value?.greaterThanOrEqualTo === null)
        acc[keyToWrite] = { $gte: value.greaterThanOrEqualTo }

      if (value?.lessThan || value?.lessThan === null)
        acc[keyToWrite] = { $lt: value.lessThan }
      if (value?.lessThanOrEqualTo || value?.lessThanOrEqualTo === null)
        acc[keyToWrite] = { $lte: value.lessThanOrEqualTo }

      if (value?.in || value?.in === null)
        acc[keyToWrite] = {
          $in:
            keyToWrite === '_id'
              ? value.in
                  // @ts-expect-error
                  .filter((inValue) => typeof inValue === 'string')
                  // @ts-expect-error
                  .map((inValue) => ObjectId.createFromHexString(inValue))
              : value.in,
        }
      if (value?.notIn || value?.notIn === null)
        acc[keyToWrite] = {
          $nin:
            keyToWrite === '_id'
              ? value.notIn
                  // @ts-expect-error
                  .filter((notInValue) => typeof notInValue === 'string')
                  // @ts-expect-error
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

export class MongoAdapter<T extends WabeTypes> implements DatabaseAdapter<T> {
  public options: AdapterOptions
  public database?: Db
  public client: MongoClient

  constructor(options: AdapterOptions) {
    this.options = options
    this.client = new MongoClient(options.databaseUrl)
  }

  async connect() {
    const client = await pRetry(() => this.client.connect(), {
      retries: 5,
      minTimeout: process.env.NODE_ENV === 'production' ? 1000 : 100,
      factor: 2,
    })

    this.database = client.db(this.options.databaseName)
    return client
  }

  async close() {
    await this.client.close()
  }

  async createClassIfNotExist(
    className: keyof T['types'],
    schema: SchemaInterface<T>,
  ) {
    if (!this.database)
      throw new Error('Connection to database is not established')

    const schemaClass = schema?.classes?.find(
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
  }

  async initializeDatabase(schema: SchemaInterface<T>): Promise<void> {
    await Promise.all(
      (schema.classes || []).map((classSchema) => {
        return this.createClassIfNotExist(classSchema.name, schema)
      }),
    )
  }

  async clearDatabase() {
    if (!this.database)
      throw new Error('Connection to database is not established')

    const collections = await this.database.collections()

    await Promise.all(
      collections
        .filter((collection) => collection.collectionName !== 'Role')
        .map((collection) => collection.deleteMany({})),
    )
  }

  count<K extends keyof T['types']>(params: CountOptions<T, K>) {
    if (!this.database)
      throw new Error('Connection to database is not established')

    const { className, where } = params

    // @ts-expect-error
    const collection = this.database.collection(className)

    const whereBuilded = buildMongoWhereQuery<T, K>(where)

    return collection.countDocuments(whereBuilded)
  }

  async getObject<K extends keyof T['types'], U extends keyof T['types'][K]>(
    params: GetObjectOptions<T, K, U>,
  ): Promise<OutputType<T, K, U>> {
    if (!this.database)
      throw new Error('Connection to database is not established')

    const { className, id, select, where } = params

    const whereBuilded = buildMongoWhereQuery<T, K>(where)

    // @ts-expect-error
    const collection = this.database.collection(className)

    const res = await collection.findOne(
      { _id: new ObjectId(id), ...whereBuilded } as Filter<any>,
      {
        projection: select ? { ...select, _id: 1 } : undefined,
      },
    )

    if (!res) throw new Error('Object not found')

    const { _id, ...resultWithout_Id } = res

    return {
      ...resultWithout_Id,
      ...{ id: _id.toString() },
    } as OutputType<T, K, U>
  }

  async getObjects<
    K extends keyof T['types'],
    U extends keyof T['types'][K],
    W extends keyof T['types'][K],
  >(params: GetObjectsOptions<T, K, U, W>): Promise<OutputType<T, K, W>[]> {
    if (!this.database)
      throw new Error('Connection to database is not established')

    const { className, select, where, offset, first, order } = params

    const whereBuilded = buildMongoWhereQuery(where)
    const orderBuilded = buildMongoOrderQuery(order)

    // @ts-expect-error
    const collection = this.database.collection(className)

    const res = await collection
      .find(whereBuilded, {
        projection: select ? { ...select, _id: 1 } : undefined,
      })
      .limit(first || 0)
      .skip(offset || 0)
      .sort(orderBuilded)
      .toArray()

    return res.map((object) => {
      const { _id, ...resultWithout_Id } = object

      return {
        ...resultWithout_Id,
        ...{ id: _id.toString() },
      } as OutputType<T, K, W>
    })
  }

  async createObject<
    K extends keyof T['types'],
    U extends keyof T['types'][K],
    W extends keyof T['types'][K],
  >(params: CreateObjectOptions<T, K, U, W>) {
    if (!this.database)
      throw new Error('Connection to database is not established')

    const { className, data } = params

    // @ts-expect-error
    const collection = this.database.collection(className)

    const res = await collection.insertOne(data, {})

    return { id: res.insertedId.toString() }
  }

  async createObjects<
    K extends keyof T['types'],
    U extends keyof T['types'][K],
    W extends keyof T['types'][K],
    X extends keyof T['types'][K],
  >(params: CreateObjectsOptions<T, K, U, W, X>) {
    if (!this.database)
      throw new Error('Connection to database is not established')

    const { className, data } = params

    // @ts-expect-error
    const collection = this.database.collection(className)

    const res = await collection.insertMany(data, {})

    return Object.values(res.insertedIds).map((id) => ({ id: id.toString() }))
  }

  async updateObject<
    K extends keyof T['types'],
    U extends keyof T['types'][K],
    W extends keyof T['types'][K],
  >(params: UpdateObjectOptions<T, K, U, W>) {
    if (!this.database)
      throw new Error('Connection to database is not established')

    const { className, id, data, where } = params

    const whereBuilded = where ? buildMongoWhereQuery<T, W>(where) : {}

    // @ts-expect-error
    const collection = this.database.collection(className)

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

    return { id }
  }

  async updateObjects<
    K extends keyof T['types'],
    U extends keyof T['types'][K],
    W extends keyof T['types'][K],
    X extends keyof T['types'][K],
  >(params: UpdateObjectsOptions<T, K, U, W, X>) {
    if (!this.database)
      throw new Error('Connection to database is not established')

    const { className, where, data, offset, first, order, context } = params

    const whereBuilded = buildMongoWhereQuery<T, W>(where)

    // @ts-expect-error
    const collection = this.database.collection(className)

    const objectsBeforeUpdate =
      await context.wabe.controllers.database.getObjects({
        className,
        where,
        // @ts-expect-error
        select: { id: true },
        offset,
        first,
        // Root because we need the id at least for hook
        context: contextWithRoot(context),
        order,
      })

    if (objectsBeforeUpdate.length === 0) return []

    await collection.updateMany(whereBuilded, {
      $set: data,
    })

    return Object.values(objectsBeforeUpdate)
      .filter(notEmpty)
      .map((object) => ({
        // The fallback will never be called, just an miss type
        id: object?.id || '',
      }))
  }

  async deleteObject<K extends keyof T['types'], U extends keyof T['types'][K]>(
    params: DeleteObjectOptions<T, K, U>,
  ) {
    if (!this.database)
      throw new Error('Connection to database is not established')

    const { className, id } = params

    const whereBuilded = buildMongoWhereQuery(params.where)

    // @ts-expect-error
    const collection = this.database.collection(className)

    const res = await collection.deleteOne({
      _id: new ObjectId(id),
      ...whereBuilded,
    })

    if (res.deletedCount === 0) throw new Error('Object not found')
  }

  async deleteObjects<
    K extends keyof T['types'],
    U extends keyof T['types'][K],
    W extends keyof T['types'][K],
  >(params: DeleteObjectsOptions<T, K, U, W>) {
    if (!this.database)
      throw new Error('Connection to database is not established')

    const { className, where } = params

    const whereBuilded = buildMongoWhereQuery(where)

    // @ts-expect-error
    const collection = this.database.collection(className)

    await collection.deleteMany(whereBuilded)
  }
}
