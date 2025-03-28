import { newDb } from 'pg-mem'
import tcpPortUsed from 'tcp-port-used'

export const runDatabase = async () => {
    const port = 5432
    const universalPort = '127.0.0.1'
    try {
    if (await tcpPortUsed.check(port, universalPort)) {
        console.info(`PostgreSQL is already running on port ${port}. Using the existing instance.`)
        return
    }

    const db = newDb()
    const adapters = db.adapters

 
        await adapters.bindServer()
        console.info('PostgreSQL started')
    } catch (error) {
        console.error('Error setting up in-memory PostgreSQL:', error)
        throw error
    }
}