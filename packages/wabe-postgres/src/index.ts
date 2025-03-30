import { Pool } from 'pg'
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
  type WabeContext,
  contextWithRoot,
  notEmpty,
  type TypeField,
} from 'wabe'

const getSQLColumnCreateTableFromType = <T extends WabeTypes>(
  type: TypeField<T>,
) => {
  switch (type.type) {
    case 'String':
      return `TEXT${type.required ? ' NOT NULL' : ''}`
    case 'Int':
      return `INT${type.required ? ' NOT NULL' : ''}`
    case 'Float':
      return `FLOAT${type.required ? ' NOT NULL' : ''}`
    case 'Boolean':
      return `BOOLEAN${type.required ? ' NOT NULL' : ''}`
    case 'Email':
      return `VARCHAR(255)${type.required ? ' NOT NULL' : ''}`
    case 'Phone':
      return `VARCHAR(255)${type.required ? ' NOT NULL' : ''}`
    case 'Date':
      return `DATE${type.required ? ' NOT NULL' : ''}`
    case 'File':
      return `JSONB${type.required ? ' NOT NULL' : ''}`
    case 'Object':
      return `JSONB${type.required ? ' NOT NULL' : ''}`
    case 'Array':
      return `JSONB${type.required ? ' NOT NULL' : ''}`
    case 'Pointer':
      return `VARCHAR(255)${type.required ? ' NOT NULL' : ''}`
    case 'Relation':
      return `JSONB${type.required ? ' NOT NULL' : ''}`
    default:
      return `JSONB${type.required ? ' NOT NULL' : ''}`
  }
}

export const buildPostgresOrderQuery = <
  T extends WabeTypes,
  K extends keyof T['types'],
  U extends keyof T['types'][K],
>(
  order?: OrderType<T, K, U>,
): string => {
  if (!order) return ''

  const objectKeys = Object.keys(order) as Array<keyof OrderType<T, K, U>>

  if (objectKeys.length === 0) return ''

  const orderClauses = objectKeys.map(
    (key) => `${key === 'id' ? '_id' : String(key)} ${order[key]}`,
  )

  return `ORDER BY ${orderClauses.join(', ')}`
}

export const buildPostgresWhereQueryAndValues = <
  T extends WabeTypes,
  K extends keyof T['types'],
>(
  where?: WhereType<T, K>,
  startParamIndex = 1,
  parentKey?: string,
): { query: string; values: any[]; paramIndex: number } => {
  if (!where) return { query: '', values: [], paramIndex: startParamIndex }

  const objectKeys = Object.keys(where) as Array<keyof WhereType<T, K>>

  if (objectKeys.length === 0)
    return { query: '', values: [], paramIndex: startParamIndex }

  const acc = objectKeys.reduce(
    (acc, key) => {
      const value = where[key]
      const keyToWrite = key === 'id' ? '_id' : String(key)

      const fullKey = parentKey
        ? `${parentKey}->>'${keyToWrite}'`
        : `"${keyToWrite}"`

      if (value?.equalTo) {
        acc.conditions.push(`${fullKey} = $${acc.paramIndex}`)
        acc.values.push(value.equalTo)
        acc.paramIndex++
        return acc
      }

      if (value?.notEqualTo) {
        acc.conditions.push(`${fullKey} != $${acc.paramIndex}`)
        acc.values.push(value.notEqualTo)
        acc.paramIndex++
        return acc
      }

      if (value?.greaterThan) {
        acc.conditions.push(`${fullKey} > $${acc.paramIndex}`)
        acc.values.push(value.greaterThan)
        acc.paramIndex++
        return acc
      }

      if (value?.greaterThanOrEqualTo) {
        acc.conditions.push(`${fullKey} >= $${acc.paramIndex}`)
        acc.values.push(value.greaterThanOrEqualTo)
        acc.paramIndex++
        return acc
      }

      if (value?.lessThan) {
        acc.conditions.push(`${fullKey} < $${acc.paramIndex}`)
        acc.values.push(value.lessThan)
        acc.paramIndex++
        return acc
      }

      if (value?.lessThanOrEqualTo) {
        acc.conditions.push(`${fullKey} <= $${acc.paramIndex}`)
        acc.values.push(value.lessThanOrEqualTo)
        acc.paramIndex++
        return acc
      }

      if (value?.in && Array.isArray(value.in) && value.in.length > 0) {
        const placeholders = value.in
          .map(() => `$${acc.paramIndex++}`)
          .join(', ')
        acc.conditions.push(`${fullKey} IN (${placeholders})`)
        acc.values.push(...value.in)
        return acc
      }

      if (
        value?.notIn &&
        Array.isArray(value.notIn) &&
        value.notIn.length > 0
      ) {
        const placeholders = value.notIn
          .map(() => `$${acc.paramIndex++}`)
          .join(', ')
        acc.conditions.push(`${fullKey} NOT IN (${placeholders})`)
        acc.values.push(...value.notIn)
        return acc
      }

      if (value?.contains) {
        acc.conditions.push(`${fullKey} @> $${acc.paramIndex}`)
        acc.values.push(
          Array.isArray(value.contains) ? value.contains : [value.contains],
        )
        acc.paramIndex++
        return acc
      }

      if (value?.notContains) {
        acc.conditions.push(`NOT (${fullKey} @> $${acc.paramIndex})`)
        acc.values.push(
          Array.isArray(value.notContains)
            ? value.notContains
            : [value.notContains],
        )
        acc.paramIndex++
        return acc
      }

      if (key === 'OR' && Array.isArray(value) && value.length > 0) {
        const orConditions = value.map((orWhere) => {
          const {
            query,
            values: orValues,
            paramIndex: newParamIndex,
          } = buildPostgresWhereQueryAndValues(orWhere, acc.paramIndex)
          acc.paramIndex = newParamIndex
          return { query, values: orValues }
        })

        const orQueries = orConditions
          .filter(({ query }) => query)
          .map(({ query }) => `(${query})`)

        if (orQueries.length > 0) {
          acc.conditions.push(`(${orQueries.join(' OR ')})`)
          orConditions.forEach(({ values: orValues }) =>
            acc.values.push(...orValues),
          )
        }
        return acc
      }

      if (key === 'AND' && Array.isArray(value) && value.length > 0) {
        const andConditions = value.map((andWhere) => {
          const {
            query,
            values: andValues,
            paramIndex: newParamIndex,
          } = buildPostgresWhereQueryAndValues(andWhere, acc.paramIndex)
          acc.paramIndex = newParamIndex
          return { query, values: andValues }
        })

        const andQueries = andConditions
          .filter(({ query }) => query)
          .map(({ query }) => `(${query})`)

        if (andQueries.length > 0) {
          acc.conditions.push(`(${andQueries.join(' AND ')})`)
          andConditions.forEach(({ values: andValues }) =>
            acc.values.push(...andValues),
          )
        }
        return acc
      }

      if (typeof value === 'object') {
        const fullKeyForObject = parentKey
          ? `${parentKey}->'${keyToWrite}'`
          : `"${keyToWrite}"`

        const nestedResult = buildPostgresWhereQueryAndValues(
          value as any,
          acc.paramIndex,
          fullKeyForObject,
        )
        if (nestedResult.query) {
          acc.conditions.push(`(${nestedResult.query})`)
          acc.values.push(...nestedResult.values)
          acc.paramIndex = nestedResult.paramIndex
        }
        return acc
      }

      return acc
    },
    {
      conditions: [] as string[],
      values: [] as any[],
      paramIndex: startParamIndex,
    },
  )

  return {
    query: acc.conditions.length > 0 ? acc.conditions.join(' AND ') : '',
    values: acc.values,
    paramIndex: acc.paramIndex,
  }
}

export class PostgresAdapter<T extends WabeTypes>
  implements DatabaseAdapter<T>
{
  public options: AdapterOptions
  public pool: Pool

  constructor(options: AdapterOptions, pool?: Pool) {
    this.options = options
    this.pool =
      pool ||
      new Pool({
        connectionString: options.databaseUrl,
      })
  }

  async connect() {
    // try {
    // 	const client = await pRetry(() => this.pool.connect(), {
    // 		retries: 5,
    // 		minTimeout: process.env.NODE_ENV === 'production' ? 1000 : 100,
    // 		factor: 2,
    // 	})
    // 	client.release()
    // 	const pgClient = await this.pool.connect()
    // 	try {
    // 		await pgClient.query(
    // 			`CREATE DATABASE IF NOT EXISTS "${this.options.databaseName}"`
    // 		)
    // 	} finally {
    // 		pgClient.release()
    // 	}
    // 	return this.pool
    // } catch (error) {
    // 	throw new Error(`Failed to connect to PostgreSQL: ${error}`)
    // }
  }

  async close() {
    if (!this.pool.ended) await this.pool.end()
  }

  async createClassIfNotExist(
    className: keyof T['types'],
    context: WabeContext<T>,
  ) {
    const schemaClass = context.wabe.config.schema?.classes?.find(
      (currentClass) => currentClass.name === className,
    )

    if (!schemaClass)
      throw new Error(`${String(className)} is not defined in schema`)

    const client = await this.pool.connect()

    try {
      const createTableParams = Object.entries(schemaClass.fields)
        .map(([fieldName, field]) => {
          const sqlColumnCreateTable = getSQLColumnCreateTableFromType(field)

          return `"${fieldName}" ${sqlColumnCreateTable}`
        })
        .join(', ')

      await client.query(`
        CREATE TABLE IF NOT EXISTS "${String(className)}" (
          _id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          ${createTableParams}
        )
      `)

      const indexes = schemaClass.indexes || []

      await Promise.all(
        indexes.map((index) => {
          const indexType = index.unique ? 'UNIQUE' : ''
          const indexDirection = index.order === 'ASC' ? 'ASC' : 'DESC'

          return client.query(`
            CREATE ${indexType} INDEX IF NOT EXISTS
            idx_${String(className)}_${String(index.field)}
            ON "${String(className)}" (${String(index.field)}' ${indexDirection})
          `)
        }),
      )

      return className
    } finally {
      client.release()
    }
  }

  async count<K extends keyof T['types']>(params: CountOptions<T, K>) {
    const { className, where, context } = params

    await this.createClassIfNotExist(className, context)

    const client = await this.pool.connect()

    try {
      const { query, values } = buildPostgresWhereQueryAndValues(where)

      const whereClause = query ? `WHERE ${query}` : ''

      const result = await client.query(
        `SELECT COUNT(*) FROM "${String(className)}" ${whereClause}`,
        values,
      )

      return Number(result.rows[0].count)
    } finally {
      client.release()
    }
  }

  async clearDatabase() {
    const client = await this.pool.connect()

    try {
      const tablesResult = await client.query(`
        SELECT tablename
        FROM pg_catalog.pg_tables
        WHERE schemaname = 'public' AND tablename != 'Role'
      `)

      await Promise.all(
        tablesResult.rows.map((table) =>
          client.query(`TRUNCATE TABLE "${table.tablename}" CASCADE`),
        ),
      )
    } finally {
      client.release()
    }
  }

  async getObject<K extends keyof T['types'], U extends keyof T['types'][K]>(
    params: GetObjectOptions<T, K, U>,
  ): Promise<OutputType<T, K, U>> {
    const { className, id, select, where, context } = params

    await this.createClassIfNotExist(className, context)

    const client = await this.pool.connect()

    try {
      const { query, values } = buildPostgresWhereQueryAndValues(where, 2)

      const whereClause = query ? `AND ${query}` : ''

      const selectFields = select
        ? Object.keys(select)
            .filter((key) => select[key as keyof typeof select])
            .map((key) => `"${key === 'id' ? '_id' : key}"`)
        : []

      const selectExpression =
        selectFields.length > 0 ? selectFields.join(', ') : '*'

      const result = await client.query(
        `SELECT ${selectExpression} FROM "${String(
          className,
        )}" WHERE _id = $1 ${whereClause} LIMIT 1`,
        [id, ...values],
      )

      if (result.rows.length === 0) {
        throw new Error('Object not found')
      }

      const row = result.rows[0]

      const { _id, ...data } = row
      return {
        ...data,
        id: _id,
      } as OutputType<T, K, U>
    } finally {
      client.release()
    }
  }

  async getObjects<
    K extends keyof T['types'],
    U extends keyof T['types'][K],
    W extends keyof T['types'][K],
  >(params: GetObjectsOptions<T, K, U, W>): Promise<OutputType<T, K, W>[]> {
    const { className, select, where, offset, first, context, order } = params

    await this.createClassIfNotExist(className, context)

    const client = await this.pool.connect()

    try {
      const { query, values } = buildPostgresWhereQueryAndValues(where)

      const whereClause = query ? `WHERE ${query}` : ''
      const orderClause = buildPostgresOrderQuery(order)
      const limitClause = first ? `LIMIT ${first}` : ''
      const offsetClause = offset ? `OFFSET ${offset}` : ''

      const selectFields = select
        ? Object.keys(select)
            .filter((key) => select[key as keyof typeof select])
            .map((key) => `"${key === 'id' ? '_id' : key}"`)
        : []

      const selectExpression =
        selectFields.length > 0 ? selectFields.join(', ') : '*'

      const result = await client.query(
        `SELECT ${selectExpression} FROM "${String(
          className,
        )}" ${whereClause} ${orderClause} ${limitClause} ${offsetClause}`,
        values,
      )

      return result.rows.map((row: Record<string, any>) => {
        const { _id, ...data } = row
        return {
          ...data,
          id: _id,
        } as OutputType<T, K, W>
      })
    } finally {
      client.release()
    }
  }

  async createObject<
    K extends keyof T['types'],
    U extends keyof T['types'][K],
    W extends keyof T['types'][K],
  >(params: CreateObjectOptions<T, K, U, W>): Promise<{ id: string }> {
    const { className, data, context } = params

    await this.createClassIfNotExist(className, context)

    const client = await this.pool.connect()

    try {
      const columns = Object.keys(data).map((column) => `"${column}"`)
      const values = Object.values(data)
      const placeholders = columns.map((_, index) => `$${index + 1}`)

      const result = await client.query(
        `INSERT INTO "${String(className)}" (${columns.join(', ')}) VALUES (${placeholders.join(', ')}) RETURNING _id`,
        values,
      )

      return { id: result.rows[0]._id }
    } finally {
      client.release()
    }
  }

  async createObjects<
    K extends keyof T['types'],
    U extends keyof T['types'][K],
    W extends keyof T['types'][K],
    X extends keyof T['types'][K],
  >(
    params: CreateObjectsOptions<T, K, U, W, X>,
  ): Promise<Array<{ id: string }>> {
    const { className, data, context } = params

    await this.createClassIfNotExist(className, context)

    const client = await this.pool.connect()

    try {
      const columns = Object.keys(data[0]).map((column) => `"${column}"`)
      const placeholders = data.map(
        (_, index) =>
          `(${columns.map((_, i) => `$${index * columns.length + i + 1}`).join(', ')})`,
      )
      const values = data.flatMap((item) => Object.values(item))

      const result = await client.query(
        `INSERT INTO "${String(className)}" (${columns.join(', ')}) VALUES ${placeholders.join(', ')} RETURNING _id`,
        values,
      )

      return result.rows.map((row: Record<string, any>) => ({
        id: row._id,
      }))
    } finally {
      client.release()
    }
  }

  async updateObject<
    K extends keyof T['types'],
    U extends keyof T['types'][K],
    W extends keyof T['types'][K],
  >(params: UpdateObjectOptions<T, K, U, W>): Promise<{ id: string }> {
    const { className, id, data, context, where } = params

    await this.createClassIfNotExist(className, context)

    const client = await this.pool.connect()

    try {
      const { query, values } = buildPostgresWhereQueryAndValues(where, 3)

      const whereClause = query ? `AND ${query}` : ''

      const setClause = Object.keys(data)
        .map((key, index) => `${key} = $${index + 2}`)
        .join(', ')

      const result = await client.query(
        `UPDATE "${String(className)}" SET ${setClause} WHERE _id = $1 ${whereClause} RETURNING _id`,
        [id, ...Object.values(data), ...values],
      )

      if (result.rowCount === 0) throw new Error('Object not found')

      return { id }
    } finally {
      client.release()
    }
  }

  async updateObjects<
    K extends keyof T['types'],
    U extends keyof T['types'][K],
    W extends keyof T['types'][K],
    X extends keyof T['types'][K],
  >(
    params: UpdateObjectsOptions<T, K, U, W, X>,
  ): Promise<Array<{ id: string }>> {
    const { className, where, data, offset, first, context, order } = params

    await this.createClassIfNotExist(className, context)

    const client = await this.pool.connect()

    try {
      const objectsBeforeUpdate =
        await context.wabe.controllers.database.getObjects({
          className,
          where,
          select: { id: true },
          offset,
          first,
          context: contextWithRoot(context),
          order,
        })

      if (objectsBeforeUpdate.length === 0) return []

      const objectIds = objectsBeforeUpdate
        .filter(notEmpty)
        .map((obj) => obj.id)

      await Promise.all(
        objectIds.map(async (id) => {
          const setClause = Object.keys(data)
            .map((key, index) => `${key} = $${index + 1}`)
            .join(', ')

          await client.query(
            `UPDATE "${String(className)}" SET ${setClause} WHERE _id = $${Object.keys(data).length + 1}`,
            [...Object.values(data), id],
          )
        }),
      )

      return objectsBeforeUpdate.filter(notEmpty).map((obj) => ({ id: obj.id }))
    } finally {
      client.release()
    }
  }

  async deleteObject<K extends keyof T['types'], U extends keyof T['types'][K]>(
    params: DeleteObjectOptions<T, K, U>,
  ): Promise<void> {
    const { className, id, context, where } = params

    await this.createClassIfNotExist(className, context)

    const client = await this.pool.connect()

    try {
      const { query, values } = buildPostgresWhereQueryAndValues(where, 2)

      const whereClause = query ? `AND ${query}` : ''

      const result = await client.query(
        `DELETE FROM "${String(className)}" WHERE _id = $1 ${whereClause}`,
        [id, ...values],
      )

      if (result.rowCount === 0) {
        throw new Error('Object not found')
      }
    } finally {
      client.release()
    }
  }

  async deleteObjects<
    K extends keyof T['types'],
    U extends keyof T['types'][K],
    W extends keyof T['types'][K],
  >(params: DeleteObjectsOptions<T, K, U, W>): Promise<void> {
    const { className, where, context } = params

    await this.createClassIfNotExist(className, context)

    const client = await this.pool.connect()

    try {
      const { query, values } = buildPostgresWhereQueryAndValues(where)

      const whereClause = query ? `WHERE ${query}` : ''

      await client.query(
        `DELETE FROM "${String(className)}" ${whereClause}`,
        values,
      )
    } finally {
      client.release()
    }
  }
}
