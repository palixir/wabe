import { MongoMemoryServer } from 'mongodb-memory-server'
import tcpPortUsed from 'tcp-port-used'

export const runDatabase = async () => {
  if (await tcpPortUsed.check(27045, '127.0.0.1')) return

  await MongoMemoryServer.create({
    binary: {
      version: '7.0.11',
    },
    instance: {
      port: 27045,
    },
  })

  console.info('MongoDB started')
}
