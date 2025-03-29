import type { Client } from 'pg'
import { newDb } from 'pg-mem'
import tcpPortUsed from 'tcp-port-used'

export const runDatabase = async (): Promise<Client | undefined> => {
  const port = 5432
  const universalPort = '127.0.0.1'
  try {
    if (await tcpPortUsed.check(port, universalPort)) return
    const db = newDb()

    console.info('PostgreSQL started')

    const { Client } = db.adapters.createPg()

    return Client
  } catch (error) {
    console.error('Error setting up in-memory PostgreSQL:', error)
  }
}
