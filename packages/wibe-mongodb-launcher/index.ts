import { MongoMemoryReplSet } from 'mongodb-memory-server'
import getPort from 'get-port'

export const runDatabase = async () => {
	const port = await getPort()
	await MongoMemoryReplSet.create({
		instanceOpts: [
			{
				port,
			},
		],
		replSet: { storageEngine: 'wiredTiger', dbName: 'wibe' },
	})
	console.info('MongoDB started')

	return port
}
