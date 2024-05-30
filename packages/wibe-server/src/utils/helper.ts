import { v4 as uuid } from 'uuid'
import { GraphQLClient } from 'graphql-request'
import { WibeApp } from '../server'
import { DatabaseEnum } from '../database'
import getPort from 'get-port'

type NotNill<T> = T extends null | undefined ? never : T

type Primitive = undefined | null | boolean | string | number

export type DeepRequired<T> = T extends Primitive
	? NotNill<T>
	: {
			[P in keyof T]-?: T[P] extends Array<infer U>
				? Array<DeepRequired<U>>
				: T[P] extends ReadonlyArray<infer U2>
					? DeepRequired<U2>
					: DeepRequired<T[P]>
		}

export const notEmpty = <T>(value: T | null | undefined): value is T =>
	value !== null && value !== undefined

export const getGraphqlClient = (port: number): GraphQLClient => {
	const client = new GraphQLClient(`http://127.0.0.1:${port}/graphql`)

	return { ...client, request: client.request<any> } as GraphQLClient
}

export const setupTests = async () => {
	const databaseId = uuid()

	const port = await getPort()

	const wibe = new WibeApp({
		wibeKey:
			'0uwFvUxM$ceFuF1aEtTtZMa7DUN2NZudqgY5ve5W*QCyb58cwMj9JeoaV@d#%29v&aJzswuudVU1%nAT+rxS0Bh&OkgBYc0PH18*',
		database: {
			type: DatabaseEnum.Mongo,
			url: 'mongodb://127.0.0.1:27045',
			name: databaseId,
		},
		port,
		schema: {
			class: [
				{
					name: '_User',
					fields: {
						name: { type: 'String' },
						age: { type: 'Int' },
						isAdmin: { type: 'Boolean', defaultValue: false },
						floatValue: { type: 'Float' },
						birthDate: { type: 'Date' },
						arrayValue: {
							type: 'Array',
							typeValue: 'String',
						},
						phone: {
							type: 'Phone',
						},
					},
				},
			],
			scalars: [
				{
					name: 'Phone',
					description: 'Phone scalar',
				},
			],
		},
	})

	await wibe.start()

	return { wibe, port }
}

export const closeTests = async (wibe: WibeApp) => {
	await WibeApp.databaseController.adapter?.close()
	await wibe.close()
}
