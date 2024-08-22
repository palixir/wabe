import { MongoMemoryReplSet } from 'mongodb-memory-server'
import tcpPortUsed from 'tcp-port-used'

export const runDatabase = async () => {
	if (await tcpPortUsed.check(27045, '127.0.0.1')) return

	const res = await MongoMemoryReplSet.create({
		binary: {
			version: '6.0.9',
		},
		instanceOpts: [
			{
				port: 27045,
			},
		],
		replSet: { storageEngine: 'wiredTiger' },
	})

	await res.waitUntilRunning()

	console.info('MongoDB started')
}
