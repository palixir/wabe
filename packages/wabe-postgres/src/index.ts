import { Pool } from 'pg'
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
	OrderType,
	WabeTypes,
	TypeField,
	SchemaInterface,
} from 'wabe'

const getSQLColumnCreateTableFromType = <T extends WabeTypes>(
	type: TypeField<T>,
) => {
	switch (type.type) {
		case 'String':
			return `TEXT${type.required ? ' NOT NULL' : ' DEFAULT NULL'}`
		case 'Int':
			return `INT${type.required ? ' NOT NULL' : ' DEFAULT NULL'}`
		case 'Float':
			return `FLOAT${type.required ? ' NOT NULL' : ' DEFAULT NULL'}`
		case 'Boolean':
			return `BOOLEAN${type.required ? ' NOT NULL' : ' DEFAULT NULL'}`
		case 'Email':
			return `VARCHAR(255)${type.required ? ' NOT NULL' : ' DEFAULT NULL'}`
		case 'Phone':
			return `VARCHAR(255)${type.required ? ' NOT NULL' : ' DEFAULT NULL'}`
		case 'Date':
			// Because we store date in iso string in database
			return `VARCHAR(255)${type.required ? ' NOT NULL' : ' DEFAULT NULL'}`
		case 'File':
			return `JSONB${type.required ? ' NOT NULL' : ' DEFAULT NULL'}`
		case 'Object':
			return `JSONB${type.required ? ' NOT NULL' : ' DEFAULT NULL'}`
		case 'Array':
			return `JSONB${type.required ? ' NOT NULL' : ' DEFAULT NULL'}`
		case 'Pointer':
			return `VARCHAR(255)${type.required ? ' NOT NULL' : ' DEFAULT NULL'}`
		case 'Relation':
			return `JSONB${type.required ? ' NOT NULL' : ' DEFAULT NULL'}`
		default:
			// Enum or scalar
			return `VARCHAR(255)${type.required ? ' NOT NULL' : ' DEFAULT NULL'}`
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

			const simpleFullKey = parentKey
				? `${parentKey}->'${keyToWrite}'`
				: `"${keyToWrite}"`

			if ('equalTo' in (value || {})) {
				if (value?.equalTo === null || value?.equalTo === undefined) {
					acc.conditions.push(`${fullKey} IS NULL`)
					return acc
				}

				acc.conditions.push(`${fullKey} = $${acc.paramIndex}`)
				acc.values.push(
					Array.isArray(value.equalTo)
						? JSON.stringify(value.equalTo)
						: value.equalTo,
				)
				acc.paramIndex++
				return acc
			}

			if ('notEqualTo' in (value || {})) {
				if (value?.notEqualTo === null || value?.notEqualTo === undefined) {
					acc.conditions.push(`${fullKey} IS NOT NULL`)
					return acc
				}

				acc.conditions.push(`${fullKey} IS DISTINCT FROM $${acc.paramIndex}`)
				acc.values.push(
					Array.isArray(value.notEqualTo)
						? JSON.stringify(value.notEqualTo)
						: value.notEqualTo,
				)
				acc.paramIndex++
				return acc
			}

			if (value?.exists === true) {
				if (parentKey) {
					acc.conditions.push(
						`${parentKey} IS NOT NULL
       AND ${parentKey} ? '${keyToWrite}'
       AND ${parentKey}->'${keyToWrite}' IS NOT NULL
       AND ${parentKey}->'${keyToWrite}' <> 'null'::jsonb`,
					)
				} else {
					acc.conditions.push(`"${keyToWrite}" IS NOT NULL`)
				}
				return acc
			}

			if (value?.exists === false) {
				if (parentKey) {
					acc.conditions.push(
						`${parentKey} IS NULL
       OR NOT (${parentKey} ? '${keyToWrite}')
       OR ${parentKey}->'${keyToWrite}' IS NULL
       OR ${parentKey}->'${keyToWrite}' = 'null'::jsonb`,
					)
				} else {
					acc.conditions.push(`"${keyToWrite}" IS NULL`)
				}
				return acc
			}

			if (value?.greaterThan || value?.greaterThan === null) {
				acc.conditions.push(`${fullKey} > $${acc.paramIndex}`)
				acc.values.push(value.greaterThan)
				acc.paramIndex++
				return acc
			}

			if (value?.greaterThanOrEqualTo || value?.greaterThanOrEqualTo === null) {
				acc.conditions.push(`${fullKey} >= $${acc.paramIndex}`)
				acc.values.push(value.greaterThanOrEqualTo)
				acc.paramIndex++
				return acc
			}

			if (value?.lessThan || value?.lessThan === null) {
				acc.conditions.push(`${fullKey} < $${acc.paramIndex}`)
				acc.values.push(value.lessThan)
				acc.paramIndex++
				return acc
			}

			if (value?.lessThanOrEqualTo || value?.lessThanOrEqualTo === null) {
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
				// Simple access on json field because contains is use for array or object column
				acc.conditions.push(`${simpleFullKey} @> $${acc.paramIndex}`)
				acc.values.push(
					Array.isArray(value.contains)
						? JSON.stringify(value.contains)
						: JSON.stringify([value.contains]),
				)
				acc.paramIndex++
				return acc
			}

			if (value?.notContains) {
				// Simple access on json field because contains is use for array or object column
				acc.conditions.push(`NOT (${simpleFullKey}  @> $${acc.paramIndex})`)
				acc.values.push(
					Array.isArray(value.notContains)
						? JSON.stringify(value.notContains)
						: JSON.stringify([value.notContains]),
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
					.map(({ query }) => `${query}`)

				if (orQueries.length > 0) {
					acc.conditions.push(`(${orQueries.join(' OR ')})`)

					for (const orCondition of orConditions) {
						acc.values.push(...orCondition.values)
					}
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
					.map(({ query }) => `${query}`)

				if (andQueries.length > 0) {
					acc.conditions.push(`(${andQueries.join(' AND ')})`)

					for (const andCondition of andConditions) {
						acc.values.push(...andCondition.values)
					}
				}
				return acc
			}

			if (typeof value === 'object') {
				const nestedResult = buildPostgresWhereQueryAndValues(
					value as any,
					acc.paramIndex,
					simpleFullKey,
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

const computeValuesFromData = (data: Record<string, any>) => {
	return Object.values(data).map((value) => {
		if (Array.isArray(value)) return JSON.stringify(value)

		return value
	})
}

export class PostgresAdapter<T extends WabeTypes>
	implements DatabaseAdapter<T>
{
	public options: AdapterOptions
	public postgresPool: Pool
	public pool: Pool

	constructor(options: AdapterOptions) {
		this.options = options
		this.postgresPool = new Pool({
			connectionString: `${options.databaseUrl}/postgres`,
		})
		this.pool = new Pool({
			// TODO: Improve this to support ending with a slash and more.
			// Need to parse to detect if user already added the database name
			connectionString: `${this.options.databaseUrl}/${this.options.databaseName}`,
		})
	}

	async initializeDatabase(schema: SchemaInterface<T>) {
		// We create the database with the pool on postgres database
		const client = await this.postgresPool.connect()

		try {
			const res = await client.query(
				'SELECT datname FROM pg_database WHERE datname = $1',
				[this.options.databaseName],
			)

			if (res.rowCount === 0)
				await client.query(`CREATE DATABASE "${this.options.databaseName}"`)

			await Promise.all(
				(schema.classes || []).map((classSchema) => {
					return this.createClassIfNotExist(classSchema.name, schema)
				}),
			)
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

	async close() {
		if (!this.pool.ended) await this.pool.end()
		if (!this.postgresPool.ended) await this.postgresPool.end()
	}

	async createClassIfNotExist(
		className: keyof T['types'],
		schema: SchemaInterface<T>,
	) {
		const schemaClass = schema?.classes?.find(
			(currentClass) => currentClass.name === className,
		)

		if (!schemaClass)
			throw new Error(`${String(className)} is not defined in schema`)

		const client = await this.pool.connect()

		try {
			const columns = Object.entries(schemaClass.fields)

			const createTableParams = columns
				.map(([fieldName, field]) => {
					const sqlColumnCreateTable = getSQLColumnCreateTableFromType(field)

					return `"${fieldName}" ${sqlColumnCreateTable}`
				})
				.join(', ')

			// Create the table if it doesn't exist
			await client.query(`
        CREATE TABLE IF NOT EXISTS "${String(className)}" (
          _id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          ${createTableParams}
        )
      `)

			// Update the table if a column is added after the first launch
			const res = await client.query(
				`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = $1
      `,
				[String(className)],
			)

			const existingColumns = res.rows.map((row) => row.column_name)

			// Add missing columns to the table
			await Promise.all(
				columns
					.filter(([fieldName]) => !existingColumns.includes(fieldName))
					.map(([fieldName, field]) => {
						const sqlColumnCreateTable = getSQLColumnCreateTableFromType(field)
						return client.query(`
              ALTER TABLE "${String(className)}"
              ADD COLUMN "${fieldName}" ${sqlColumnCreateTable}
            `)
					}),
			)

			// Create indexes if they don't exist
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
		const { className, where } = params

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

	async getObject<K extends keyof T['types'], U extends keyof T['types'][K]>(
		params: GetObjectOptions<T, K, U>,
	): Promise<OutputType<T, K, U>> {
		const { className, id, select, where } = params

		const client = await this.pool.connect()

		try {
			// 2 because 1 is _id
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

			if (result.rows.length === 0) throw new Error('Object not found')

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
		const { className, select, where, offset, first, order } = params

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

			const rows = result.rows as Array<Record<string, any>>

			return rows.map((row) => {
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
		const { className, data } = params

		const client = await this.pool.connect()

		try {
			const columns = Object.keys(data).map((column) => `"${column}"`)
			const values = computeValuesFromData(data)
			const placeholders = columns.map((_, index) => `$${index + 1}`)

			const result = await client.query(
				columns.length === 0
					? `INSERT INTO "${String(className)}" DEFAULT VALUES RETURNING _id`
					: `INSERT INTO "${String(className)}" (${columns.join(', ')}) VALUES (${placeholders.join(', ')}) RETURNING _id`,
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
		const { className, data } = params

		const client = await this.pool.connect()

		try {
			if (data.length === 0) return []

			// Every line is empty
			if (data.every((item) => Object.keys(item).length === 0)) {
				const placeholders = data.map(() => 'DEFAULT VALUES').join(', ')

				const result = await client.query(
					`INSERT INTO "${String(className)}" ${placeholders} RETURNING _id`,
				)

				return result.rows.map((row) => ({ id: row._id }))
			}

			const allColumns = Array.from(
				new Set(data.flatMap((item) => Object.keys(item))),
			)

			const columns = allColumns.map((column) => `"${column}"`)

			const values = data.flatMap((item: any) =>
				allColumns.map((col) => {
					const value = item[col]
					return Array.isArray(value) ? JSON.stringify(value) : (value ?? null)
				}),
			)

			const placeholders = data.map((_, rowIndex) => {
				const offset = rowIndex * allColumns.length
				return `(${allColumns
					.map((_, colIndex) => `$${offset + colIndex + 1}`)
					.join(', ')})`
			})

			const result = await client.query(
				`INSERT INTO "${String(className)}" (${columns.join(
					', ',
				)}) VALUES ${placeholders.join(', ')} RETURNING _id`,
				values,
			)

			return result.rows.map((row) => ({ id: row._id }))
		} finally {
			client.release()
		}
	}

	async updateObject<
		K extends keyof T['types'],
		U extends keyof T['types'][K],
		W extends keyof T['types'][K],
	>(params: UpdateObjectOptions<T, K, U, W>): Promise<{ id: string }> {
		const { className, id, data, where } = params

		const client = await this.pool.connect()

		try {
			const dataKeys = Object.keys(data)
			const { query, values } = buildPostgresWhereQueryAndValues(
				where,
				dataKeys.length + 2,
			)

			const whereClause = query ? `AND ${query}` : ''

			const setClause = dataKeys
				.map((key, index) => `"${key}" = $${index + 2}`)
				.join(', ')

			const result = await client.query(
				`UPDATE "${String(className)}" SET ${setClause} WHERE _id = $1 ${whereClause} RETURNING _id`,
				[id, ...computeValuesFromData(data), ...values],
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

		const client = await this.pool.connect()

		try {
			const objectsBeforeUpdate =
				await context.wabe.controllers.database.getObjects({
					className,
					where,
					// @ts-expect-error
					select: { id: true },
					offset,
					first,
					context: {
						...context,
						isRoot: true,
					},
					order,
				})

			if (objectsBeforeUpdate.length === 0) return []

			const objectIds = objectsBeforeUpdate
				.filter(Boolean)
				.map((obj: any) => obj.id) as string[]

			await Promise.all(
				objectIds.map(async (id) => {
					const setClause = Object.keys(data)
						.map((key, index) => `"${key}" = $${index + 1}`)
						.join(', ')

					await client.query(
						`UPDATE "${String(className)}" SET ${setClause} WHERE _id = $${Object.keys(data).length + 1}`,
						[...computeValuesFromData(data), id],
					)
				}),
			)

			return objectsBeforeUpdate
				.filter(Boolean)
				.map((obj: any) => ({ id: obj.id }))
		} finally {
			client.release()
		}
	}

	async deleteObject<K extends keyof T['types'], U extends keyof T['types'][K]>(
		params: DeleteObjectOptions<T, K, U>,
	): Promise<void> {
		const { className, id, where } = params

		const client = await this.pool.connect()

		try {
			const { query, values } = buildPostgresWhereQueryAndValues(where, 2)

			const whereClause = query ? `AND ${query}` : ''

			const result = await client.query(
				`DELETE FROM "${String(className)}" WHERE _id = $1 ${whereClause}`,
				[id, ...values],
			)

			if (result.rowCount === 0) throw new Error('Object not found')
		} finally {
			client.release()
		}
	}

	async deleteObjects<
		K extends keyof T['types'],
		U extends keyof T['types'][K],
		W extends keyof T['types'][K],
	>(params: DeleteObjectsOptions<T, K, U, W>): Promise<void> {
		const { className, where } = params

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
