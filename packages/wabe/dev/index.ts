import { runDatabase } from 'wabe-mongodb-launcher'
import { Wabe } from '../src'
import { DatabaseEnum } from '../src/database'
import type {
	WabeSchemaEnums,
	WabeSchemaScalars,
	WabeSchemaTypes,
} from '../generated/wabe'
import { devSchema } from './schema'

const run = async () => {
	await runDatabase()

	const wabe = new Wabe<{
		types: WabeSchemaTypes
		scalars: WabeSchemaScalars
		enums: WabeSchemaEnums
	}>({
		codegen: {
			enabled: true,
			path: `${import.meta.dirname}/../generated/`,
		},
		rootKey:
			'0uwFvUxM$ceFuF1aEtTtZMa7DUN2NZudqgY5ve5W*QCyb58cwMj9JeoaV@d#%29v&aJzswuudVU1%nAT+rxS0Bh&OkgBYc0PH18*',
		authentication: {
			session: {
				cookieSession: true,
			},
			roles: ['Admin', 'Client'],
			successRedirectPath:
				'http://localhost:3000/auth/oauth?provider=google',
			failureRedirectPath:
				'http://localhost:3000/auth/oauth?provider=google',
			providers: {
				x: {
					clientId: 'SVFhTWpONVM4S09TWVB6dF9CZjc6MTpjaQ',
					clientSecret:
						'V95bDcUgQgYNqweVRO8RFrqWJxr_yckd_b5Npp-MmEBxMr6KuR',
				},
				google: {
					clientId:
						'296431040556-4jh84e5s264rmrgnh8bmegb0kl550teg.apps.googleusercontent.com',
					clientSecret: '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',
				},
			},
			customAuthenticationMethods: [
				{
					name: 'otp',
					input: {
						code: {
							type: 'String',
						},
					},
					provider: {} as any,
					isSecondaryFactor: true,
				},
			],
		},
		database: {
			type: DatabaseEnum.Mongo,
			url: 'mongodb://127.0.0.1:27045',
			name: 'Wabe',
		},
		port: 3000,
		schema: devSchema,
	})

	await wabe.start()
}

run().catch((err) => {
	console.error(err)
})
