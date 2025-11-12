import { MongoMemoryServer } from 'mongodb-memory-server'
import tcpPortUsed from 'tcp-port-used'
import PQueue from 'p-queue'

const queue = new PQueue({ concurrency: 1 })

export const runDatabase = async (): Promise<void> =>
	queue.add(async () => {
		await startMongo()
	})

const startMongo = async (): Promise<void> => {
	if (await tcpPortUsed.check(27045, '127.0.0.1')) return

	await MongoMemoryServer.create({
		binary: {
			version: '8.0.5',
		},
		instance: {
			port: 27045,
		},
	})

	console.info('MongoDB started')
}
