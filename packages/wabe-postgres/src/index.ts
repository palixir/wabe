import { Pool, type PoolClient, type QueryResult } from 'pg'
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
	type WabeContext,
	contextWithRoot,
} from 'wabe'

// Utility function to check if a value exists
const notEmpty = <T>(value: T | null | undefined): value is T =>
	value !== null && value !== undefined

export const buildPostgresOrderQuery = <
	T extends WabeTypes,
	K extends keyof T['types'],
	U extends keyof T['types'][K]
>(
	order?: OrderType<T, K, U>
): string => {
	if (!order) return ''

	const objectKeys = Object.keys(order) as Array<keyof OrderType<T, K, U>>

	if (objectKeys.length === 0) return ''

	const orderClauses = objectKeys.map((key) => {
		const value = order[key]
		return `${key === 'id' ? '_id' : String(key)} ${value}`
	})

	return `ORDER BY ${orderClauses.join(', ')}`
}

export const buildPostgresWhereQueryAndValues = <
	T extends WabeTypes,
	K extends keyof T['types']
>(
	where?: WhereType<T, K>,
	startParamIndex: number = 1
): { query: string; values: any[]; paramIndex: number } => {
	if (!where) return { query: '', values: [], paramIndex: startParamIndex }

	const objectKeys = Object.keys(where) as Array<keyof WhereType<T, K>>

	if (objectKeys.length === 0)
		return { query: '', values: [], paramIndex: startParamIndex }

	let paramIndex = startParamIndex
	const conditions: string[] = []
	const values: any[] = []

	for (const key of objectKeys) {
		const value = where[key]
		const keyToWrite = key === 'id' ? '_id' : String(key)

		if (value?.equalTo !== undefined) {
			conditions.push(`${keyToWrite} = $${paramIndex}`)
			values.push(value.equalTo)
			paramIndex++
		}

		if (value?.notEqualTo !== undefined) {
			conditions.push(`${keyToWrite} != $${paramIndex}`)
			values.push(value.notEqualTo)
			paramIndex++
		}

		if (value?.greaterThan !== undefined) {
			conditions.push(`${keyToWrite} > $${paramIndex}`)
			values.push(value.greaterThan)
			paramIndex++
		}

		if (value?.greaterThanOrEqualTo !== undefined) {
			conditions.push(`${keyToWrite} >= $${paramIndex}`)
			values.push(value.greaterThanOrEqualTo)
			paramIndex++
		}

		if (value?.lessThan !== undefined) {
			conditions.push(`${keyToWrite} < $${paramIndex}`)
			values.push(value.lessThan)
			paramIndex++
		}

		if (value?.lessThanOrEqualTo !== undefined) {
			conditions.push(`${keyToWrite} <= $${paramIndex}`)
			values.push(value.lessThanOrEqualTo)
			paramIndex++
		}

		if (
			value?.in !== undefined &&
			Array.isArray(value.in) &&
			value.in.length > 0
		) {
			const placeholders = value.in
				.map(() => `$${paramIndex++}`)
				.join(', ')
			conditions.push(`${keyToWrite} IN (${placeholders})`)
			values.push(...value.in)
		}

		if (
			value?.notIn !== undefined &&
			Array.isArray(value.notIn) &&
			value.notIn.length > 0
		) {
			const placeholders = value.notIn
				.map(() => `$${paramIndex++}`)
				.join(', ')
			conditions.push(`${keyToWrite} NOT IN (${placeholders})`)
			values.push(...value.notIn)
		}

		if (value?.contains !== undefined) {
			// For array containment in PostgreSQL
			conditions.push(`${keyToWrite} @> $${paramIndex}`)
			values.push(
				Array.isArray(value.contains)
					? value.contains
					: [value.contains]
			)
			paramIndex++
		}

		if (value?.notContains !== undefined) {
			// For array not containing in PostgreSQL
			conditions.push(`NOT (${keyToWrite} @> $${paramIndex})`)
			values.push(
				Array.isArray(value.notContains)
					? value.notContains
					: [value.notContains]
			)
			paramIndex++
		}

		if (key === 'OR' && Array.isArray(value) && value.length > 0) {
			const orConditions: string[] = []
			for (const orWhere of value) {
				const {
					query,
					values: orValues,
					paramIndex: newParamIndex,
				} = buildPostgresWhereQueryAndValues(orWhere, paramIndex)
				if (query) {
					orConditions.push(`(${query})`)
					values.push(...orValues)
					paramIndex = newParamIndex
				}
			}
			if (orConditions.length > 0) {
				conditions.push(`(${orConditions.join(' OR ')})`)
			}
		}

		if (key === 'AND' && Array.isArray(value) && value.length > 0) {
			const andConditions: string[] = []
			for (const andWhere of value) {
				const {
					query,
					values: andValues,
					paramIndex: newParamIndex,
				} = buildPostgresWhereQueryAndValues(andWhere, paramIndex)
				if (query) {
					andConditions.push(`(${query})`)
					values.push(...andValues)
					paramIndex = newParamIndex
				}
			}
			if (andConditions.length > 0) {
				conditions.push(`(${andConditions.join(' AND ')})`)
			}
		}

		// Handle nested object conditions (recursive)
		if (
			typeof value === 'object' &&
			!Array.isArray(value) &&
			key !== 'OR' &&
			key !== 'AND' &&
			!('equalTo' in value) &&
			!('notEqualTo' in value) &&
			!('greaterThan' in value) &&
			!('greaterThanOrEqualTo' in value) &&
			!('lessThan' in value) &&
			!('lessThanOrEqualTo' in value) &&
			!('in' in value) &&
			!('notIn' in value) &&
			!('contains' in value) &&
			!('notContains' in value)
		) {
			const {
				query,
				values: nestedValues,
				paramIndex: newParamIndex,
			} = buildPostgresWhereQueryAndValues(value as any, paramIndex)

			if (query) {
				// In PostgreSQL, for accessing JSON fields we use ->>
				const nestedConditions = query.replace(
					/([a-zA-Z0-9_]+)\s*=/g,
					`${String(keyToWrite)}->>'$1' =`
				)
				conditions.push(`(${nestedConditions})`)
				values.push(...nestedValues)
				paramIndex = newParamIndex
			}
		}
	}

	return {
		query: conditions.length > 0 ? conditions.join(' AND ') : '',
		values,
		paramIndex,
	}
}

export class PostgresAdapter<T extends WabeTypes>
	implements DatabaseAdapter<T>
{
	public options: AdapterOptions
	public pool: Pool

	constructor(options: AdapterOptions) {
		this.options = options
		this.pool = new Pool({
			connectionString: options.databaseUrl,
		})
	}

	async connect() {
		try {
			const client = await pRetry(() => this.pool.connect(), {
				retries: 5,
				minTimeout: process.env.NODE_ENV === 'production' ? 1000 : 100,
				factor: 2,
			})
			client.release() // Release the client back to the pool

			// Create the database if it doesn't exist
			const pgClient = await this.pool.connect()
			try {
				await pgClient.query(
					`CREATE DATABASE IF NOT EXISTS "${this.options.databaseName}"`
				)
			} finally {
				pgClient.release()
			}

			return this.pool
		} catch (error) {
			throw new Error(`Failed to connect to PostgreSQL: ${error}`)
		}
	}

	async close() {
		return this.pool.end()
	}

	async createClassIfNotExist(
		className: keyof T['types'],
		context: WabeContext<T>
	) {
		const schemaClass = context.wabe.config.schema?.classes?.find(
			(currentClass) => currentClass.name === className
		)

		if (!schemaClass)
			throw new Error(`${String(className)} is not defined in schema`)

		const client = await this.pool.connect()

		try {
			// Create table if not exists
			await client.query(`
        CREATE TABLE IF NOT EXISTS "${String(className)}" (
          _id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          data JSONB NOT NULL DEFAULT '{}'::jsonb
        )
      `)

			// Create indexes
			const indexes = schemaClass.indexes || []

			for (const index of indexes) {
				const indexType = index.unique ? 'UNIQUE' : ''
				const indexDirection = index.order === 'ASC' ? 'ASC' : 'DESC'

				// For JSON fields, create an index on the jsonb expression
				await client.query(`
          CREATE ${indexType} INDEX IF NOT EXISTS 
          idx_${String(className)}_${String(index.field)} 
          ON "${String(className)}" ((data->>'${String(
					index.field
				)}') ${indexDirection})
        `)
			}

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
				values
			)

			return parseInt(result.rows[0].count, 10)
		} finally {
			client.release()
		}
	}

	async clearDatabase() {
		const client = await this.pool.connect()

		try {
			// Get all tables except Role
			const tablesResult = await client.query(`
        SELECT tablename 
        FROM pg_catalog.pg_tables 
        WHERE schemaname = 'public' AND tablename != 'Role'
      `)

			// Delete all data from each table
			for (const table of tablesResult.rows) {
				await client.query(
					`TRUNCATE TABLE "${table.tablename}" CASCADE`
				)
			}
		} finally {
			client.release()
		}
	}

	async getObject<K extends keyof T['types'], U extends keyof T['types'][K]>(
		params: GetObjectOptions<T, K, U>
	): Promise<OutputType<T, K, U>> {
		const { className, id, select, where, context } = params

		await this.createClassIfNotExist(className, context)

		const client = await this.pool.connect()

		try {
			let { query, values } = buildPostgresWhereQueryAndValues(where, 2) // Start from 2 because $1 is used for id

			const whereClause = query ? `AND ${query}` : ''

			// If select is provided, we need to extract only those fields from the data
			let selectFields: string[] = []
			if (select) {
				// Convert select to array of keys where the value is true
				for (const key in select) {
					if (
						Object.prototype.hasOwnProperty.call(select, key) &&
						select[key as keyof typeof select]
					) {
						selectFields.push(key)
					}
				}
			}

			let selectExpression = '*'
			if (selectFields.length > 0) {
				// Include _id and construct a JSON object with just the selected fields
				selectExpression = `_id, jsonb_build_object(${selectFields
					.map((field) => `'${field}', data->>'${field}'`)
					.join(', ')}) as data`
			}

			const result = await client.query(
				`SELECT ${selectExpression} FROM "${String(
					className
				)}" WHERE _id = $1 ${whereClause} LIMIT 1`,
				[id, ...values]
			)

			if (result.rows.length === 0) {
				throw new Error('Object not found')
			}

			const row = result.rows[0]

			// Convert _id to id in the result
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
		W extends keyof T['types'][K]
	>(params: GetObjectsOptions<T, K, U, W>): Promise<OutputType<T, K, W>[]> {
		const { className, select, where, offset, first, context, order } =
			params

		await this.createClassIfNotExist(className, context)

		const client = await this.pool.connect()

		try {
			const { query, values } = buildPostgresWhereQueryAndValues(where)

			const whereClause = query ? `WHERE ${query}` : ''
			const orderClause = buildPostgresOrderQuery(order)
			const limitClause = first ? `LIMIT ${first}` : ''
			const offsetClause = offset ? `OFFSET ${offset}` : ''

			// If select is provided, we need to extract only those fields from the data
			let selectFields: string[] = []
			if (select) {
				// Convert select to array of keys where the value is true
				for (const key in select) {
					if (
						Object.prototype.hasOwnProperty.call(select, key) &&
						select[key as keyof typeof select]
					) {
						selectFields.push(key)
					}
				}
			}

			let selectExpression = '*'
			if (selectFields.length > 0) {
				// Include _id and construct a JSON object with just the selected fields
				selectExpression = `_id, jsonb_build_object(${selectFields
					.map((field) => `'${field}', data->>'${field}'`)
					.join(', ')}) as data`
			}

			const result = await client.query(
				`SELECT ${selectExpression} FROM "${String(
					className
				)}" ${whereClause} ${orderClause} ${limitClause} ${offsetClause}`,
				values
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
		W extends keyof T['types'][K]
	>(params: CreateObjectOptions<T, K, U, W>): Promise<{ id: string }> {
		const { className, data, context } = params

		await this.createClassIfNotExist(className, context)

		const client = await this.pool.connect()

		try {
			const result = await client.query(
				`INSERT INTO "${String(
					className
				)}" (data) VALUES ($1) RETURNING _id`,
				[JSON.stringify(data)]
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
		X extends keyof T['types'][K]
	>(
		params: CreateObjectsOptions<T, K, U, W, X>
	): Promise<Array<{ id: string }>> {
		const { className, data, context } = params

		await this.createClassIfNotExist(className, context)

		const client = await this.pool.connect()

		try {
			const placeholders = data
				.map((_, index) => `($${index + 1})`)
				.join(', ')
			const values = data.map((item) => JSON.stringify(item))

			const result = await client.query(
				`INSERT INTO "${String(
					className
				)}" (data) VALUES ${placeholders} RETURNING _id`,
				values
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
		W extends keyof T['types'][K]
	>(params: UpdateObjectOptions<T, K, U, W>): Promise<{ id: string }> {
		const { className, id, data, context, where } = params

		await this.createClassIfNotExist(className, context)

		const client = await this.pool.connect()

		try {
			let { query, values } = buildPostgresWhereQueryAndValues(where, 3) // Start from 3 because $1 is for id and $2 is for data

			const whereClause = query ? `AND ${query}` : ''

			// In PostgreSQL, we use jsonb_set to update specific fields in the JSON data
			// First, we need to get the current data
			const getResult = await client.query(
				`SELECT data FROM "${String(className)}" WHERE _id = $1`,
				[id]
			)

			if (getResult.rows.length === 0) {
				throw new Error('Object not found')
			}

			const currentData = getResult.rows[0].data
			const updatedData = { ...currentData, ...data }

			const result = await client.query(
				`UPDATE "${String(
					className
				)}" SET data = $2 WHERE _id = $1 ${whereClause} RETURNING _id`,
				[id, JSON.stringify(updatedData), ...values]
			)

			if (result.rowCount === 0) {
				throw new Error(
					'Object not found or where clause not satisfied'
				)
			}

			return { id }
		} finally {
			client.release()
		}
	}

	async updateObjects<
		K extends keyof T['types'],
		U extends keyof T['types'][K],
		W extends keyof T['types'][K],
		X extends keyof T['types'][K]
	>(
		params: UpdateObjectsOptions<T, K, U, W, X>
	): Promise<Array<{ id: string }>> {
		const { className, where, data, offset, first, context, order } = params

		await this.createClassIfNotExist(className, context)

		const client = await this.pool.connect()

		try {
			// First get the objects to update to return their IDs later
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

			// Get object IDs to update
			const objectIds = objectsBeforeUpdate
				.filter(notEmpty)
				.map((obj) => obj.id)

			// Perform the update for each object
			for (const id of objectIds) {
				// Get current data
				const getResult = await client.query(
					`SELECT data FROM "${String(className)}" WHERE _id = $1`,
					[id]
				)

				if (getResult.rows.length > 0) {
					const currentData = getResult.rows[0].data
					const updatedData = { ...currentData, ...data }

					await client.query(
						`UPDATE "${String(
							className
						)}" SET data = $2 WHERE _id = $1`,
						[id, JSON.stringify(updatedData)]
					)
				}
			}

			return objectsBeforeUpdate
				.filter(notEmpty)
				.map((obj) => ({ id: obj.id }))
		} finally {
			client.release()
		}
	}

	async deleteObject<
		K extends keyof T['types'],
		U extends keyof T['types'][K]
	>(params: DeleteObjectOptions<T, K, U>): Promise<void> {
		const { className, id, context, where } = params

		await this.createClassIfNotExist(className, context)

		const client = await this.pool.connect()

		try {
			let { query, values } = buildPostgresWhereQueryAndValues(where, 2) // Start from 2 because $1 is used for id

			const whereClause = query ? `AND ${query}` : ''

			const result = await client.query(
				`DELETE FROM "${String(
					className
				)}" WHERE _id = $1 ${whereClause}`,
				[id, ...values]
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
		W extends keyof T['types'][K]
	>(params: DeleteObjectsOptions<T, K, U, W>): Promise<void> {
		const { className, where, context } = params

		await this.createClassIfNotExist(className, context)

		const client = await this.pool.connect()

		try {
			const { query, values } = buildPostgresWhereQueryAndValues(where)

			const whereClause = query ? `WHERE ${query}` : ''

			await client.query(
				`DELETE FROM "${String(className)}" ${whereClause}`,
				values
			)
		} finally {
			client.release()
		}
	}
}
