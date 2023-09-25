import { MongoMemoryReplSet } from 'mongodb-memory-server'

const run = async () => {
	await MongoMemoryReplSet.create({
		instanceOpts: [
			{
				port: 27017, // port number for the instance
			},
		],
		replSet: { storageEngine: 'wiredTiger', dbName: 'wibe' },
	})
	console.info('MongoDB started')
}

run().catch(console.error)
