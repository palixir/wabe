import { newDb } from 'pg-mem'
import tcpPortUsed from 'tcp-port-used'
import { PostgresMock } from 'pgmock'

export const runDatabase = async () => {
  const port = 5432
  const universalPort = '127.0.0.1'
  try {
    if (await tcpPortUsed.check(port, universalPort)) return
    const db = newDb()

    console.info('PostgreSQL started')
  } catch (error) {
    console.error('Error setting up in-memory PostgreSQL:', error)
  }
}

runDatabase()
