import { MongoMemoryServer } from 'mongodb-memory-server'
import tcpPortUsed from 'tcp-port-used'

type RunDatabaseOptions = {
	binaryVersion?: string
}

export const runDatabase = async (
	port: number = 27045,
	options: RunDatabaseOptions = {},
): Promise<void> => startMongo(port, options)

const startMongo = async (
	port: number,
	{ binaryVersion = '8.2.1' }: RunDatabaseOptions = {},
): Promise<void> => {
	if (await tcpPortUsed.check(port, '127.0.0.1')) return

	await MongoMemoryServer.create({
		binary: {
			version: binaryVersion,
		},
		instance: {
			port,
		},
	})

	console.info('MongoDB started')
}
