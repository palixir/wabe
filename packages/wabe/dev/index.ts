import { runDatabase } from 'wabe-mongodb-launcher'
import { Wabe } from '../src'
import type {
	WabeSchemaEnums,
	WabeSchemaScalars,
	WabeSchemaTypes,
} from '../generated/wabe'
import { devConfig } from './config'

const run = async () => {
	await runDatabase()

	const wabe = new Wabe<{
		types: WabeSchemaTypes
		scalars: WabeSchemaScalars
		enums: WabeSchemaEnums
	}>(devConfig)

	await wabe.start()
}

run().catch((err) => {
	console.error(err)
})
