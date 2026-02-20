import { v4 as uuid } from 'uuid'
import type { RateLimitOptions } from 'wobe'
import { type ClassInterface, EmailDevAdapter, FileDevAdapter } from '..'
import { Wabe } from '../server'
import type { DevWabeTypes } from './helper'
import getPort from 'get-port'

export const getDatabaseAdapter = async (databaseName: string) => {
	const mongodbAdapter = await import('wabe-mongodb')

	return new mongodbAdapter.MongoAdapter<DevWabeTypes>({
		// For postgres
		// databaseUrl: 'postgresql://wabe:wabe@localhost:5432',
		databaseUrl: 'mongodb://localhost:27045',
		databaseName,
	})
}

export const setupTests = async (
	additionalClasses: ClassInterface<any>[] = [],
	options: {
		isProduction?: boolean
		disableCSRFProtection?: boolean
		disableIntrospection?: boolean
		rootKey?: string
		rateLimit?: RateLimitOptions
	} = {},
) => {
	const databaseId = uuid()

	const port = await getPort()

	const wabe = new Wabe<DevWabeTypes>({
		isProduction: !!options.isProduction,
		rootKey: options.rootKey ?? 'dev',
		database: {
			// @ts-expect-error
			adapter: await getDatabaseAdapter(databaseId),
		},
		security: {
			// To make test easier keep default value to true
			disableCSRFProtection: options.disableCSRFProtection ?? true,
			...(options.disableIntrospection !== undefined && {
				disableIntrospection: options.disableIntrospection,
			}),
			...(options.rateLimit && { rateLimit: options.rateLimit }),
		},
		authentication: {
			roles: ['Client', 'Client2', 'Client3', 'Admin'],
			session: {
				jwtSecret: 'dev',
				cookieSession: true,
			},
		},
		port,
		email: {
			adapter: new EmailDevAdapter(),
			mainEmail: 'main.email@wabe.com',
		},
		file: {
			adapter: new FileDevAdapter(),
			// 12 hours of cache
			urlCacheInSeconds: 3600 * 12,
		},
		schema: {
			classes: [
				...additionalClasses,
				{
					name: 'User',
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
						test: { type: 'TestScalar' },
					},
					searchableFields: ['email'],
					permissions: {
						create: {
							requireAuthentication: false,
						},
						delete: {
							requireAuthentication: true,
						},
						update: {
							requireAuthentication: false,
						},
						read: {
							requireAuthentication: false,
						},
						acl: async (hookObject) => {
							await hookObject.addACL('users', {
								userId: hookObject.object?.id,
								read: true,
								write: true,
							})

							await hookObject.addACL('roles', null)
						},
					},
				},
			],
			scalars: [
				{
					name: 'TestScalar',
					description: 'Test scalar',
				},
			],
		},
	})

	await wabe.start()

	return { wabe, port }
}

export const closeTests = async (wabe: Wabe<DevWabeTypes>) => {
	await wabe.close()
}
