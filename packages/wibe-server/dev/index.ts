import { runDatabase } from 'wibe-mongodb-launcher'
import { WibeApp } from '../src'
import { DatabaseEnum } from '../src/database'
import { WibeSchemaType } from '../src/schema/Schema'

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
					name: { type: WibeSchemaType.String },
					age: { type: WibeSchemaType.Int },
					isCool: { type: WibeSchemaType.Boolean },
					birthDate: { type: WibeSchemaType.Date },
				},
			},
			{
				name: 'Address',
				fields: {
					address1: { type: WibeSchemaType.String },
					address2: { type: WibeSchemaType.String },
					postalCode: { type: WibeSchemaType.String },
					city: { type: WibeSchemaType.String },
					country: { type: WibeSchemaType.String },
				},
			},
		],
	})

	await wibe.start()
}

run()
