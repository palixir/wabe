import { Schema } from '../../schema'

export interface DatabaseAdapter {
	fillDatabase(schema: Schema): Promise<void>
}

export interface AdapterOptions {
	url: string
}
