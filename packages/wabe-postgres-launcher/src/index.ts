import type { Client } from 'pg'
import { newDb } from 'pg-mem'
import tcpPortUsed from 'tcp-port-used'

export const runDatabase = async (): Promise<Client | undefined> => {
  if (await tcpPortUsed.check(27045, '127.0.0.1')) return
  const db = newDb()

  console.info('PostgreSQL started')

  const { Client } = db.adapters.createPg()

  return Client
}
