import type { Client, Pool } from 'pg'
import { randomUUID } from 'node:crypto'
import { DataType, newDb } from 'pg-mem'
import tcpPortUsed from 'tcp-port-used'

export const runDatabase = async (): Promise<
	{ client: Client; pool: Pool } | undefined
> => {
	if (await tcpPortUsed.check(27045, '127.0.0.1')) return
	const db = newDb()

	db.public.registerFunction({
		name: 'gen_random_uuid',
		returns: DataType.text,
		implementation: () => randomUUID(),
	})

	console.info('PostgreSQL started')

	const { Pool } = db.adapters.createPg()

	const pool = new Pool({
		connectionString: 'postgres://localhost:27045/memdb',
	})

	const client = await pool.connect()

	return { client, pool }
}
