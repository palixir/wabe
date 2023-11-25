import { runDatabase } from 'wibe-mongodb-launcher'
import { WibeApp } from '../src'
import { DatabaseEnum } from '../src/database'
import { WibeScalarType } from '../src/schema/Schema'

const run = async () => {
	await runDatabase()

	const wibe = new WibeApp({
		database: {
			type: DatabaseEnum.Mongo,
			url: `mongodb://127.0.0.1:27045`,
			name: 'Wibe',
		},
		port: 3000,
		schema: [
			{
				name: 'User',
				fields: {
					name: { type: WibeScalarType.String },
					age: { type: WibeScalarType.Int },
					isCool: { type: WibeScalarType.Boolean },
				},
			},
			{
				name: 'Address',
				fields: {
					address1: { type: WibeScalarType.String },
					address2: { type: WibeScalarType.String },
					postalCode: { type: WibeScalarType.String },
					city: { type: WibeScalarType.String },
					country: { type: WibeScalarType.String },
				},
			},
		],
	})

	await wibe.start()
}

run()
