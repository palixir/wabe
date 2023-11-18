import { runDatabase } from 'wibe-mongodb-launcher'
import { WibeApp } from '../src'
import { DatabaseEnum } from '../src/database'

const run = async () => {
	await runDatabase()

	const wibe = new WibeApp({
		database: {
			type: DatabaseEnum.Mongo,
			url: `mongodb://127.0.0.1:27045`,
			name: 'Wibe',
		},
		port: 3000,
		schema: [{ name: 'Collection1', fields: { name: { type: 'String' } } }],
	})

	await wibe.start()
}

run()
