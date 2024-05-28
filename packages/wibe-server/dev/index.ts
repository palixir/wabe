import { runDatabase } from 'wibe-mongodb-launcher'
import { WibeApp } from '../src'
import { DatabaseEnum } from '../src/database'

const run = async () => {
	await runDatabase()

	const wibe = new WibeApp({
		wibeKey:
			'0uwFvUxM$ceFuF1aEtTtZMa7DUN2NZudqgY5ve5W*QCyb58cwMj9JeoaV@d#%29v&aJzswuudVU1%nAT+rxS0Bh&OkgBYc0PH18*',
		authentication: {
			roles: ['Admin', 'Client'],
			successRedirectPath: 'http://localhost:5173',
			failureRedirectPath: 'http://localhost:5173',
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
			name: 'Wibe',
		},
		port: 3000,
		schema: {
			class: [
				{
					name: '_User',
					description: 'User class',
					fields: {
						name: { type: 'String' },
						age: { type: 'Int' },
						isCool: { type: 'Boolean' },
						email: { type: 'Email', required: true },
						post: {
							type: 'Pointer',
							class: 'Post',
						},
						postRelation: { type: 'Relation', class: 'Post' },
						birthDate: {
							type: 'Date',
						},
						phone: {
							type: 'Phone',
						},
						role: {
							type: 'Role',
						},
						address: {
							type: 'Object',
							object: {
								name: 'Address',
								fields: {
									address1: {
										type: 'String',
									},
									address2: {
										type: 'String',
									},
									postalCode: {
										type: 'Int',
									},
									city: {
										type: 'String',
									},
									country: {
										type: 'String',
									},
								},
							},
						},
						object: {
							type: 'Object',
							object: {
								name: 'Object',
								fields: {
									objectOfObject: {
										type: 'Object',
										object: {
											name: 'ObjectOfObject',
											fields: {
												name: {
													type: 'String',
												},
											},
										},
									},
								},
							},
						},
					},
					resolvers: {
						queries: {
							helloWorld: {
								type: 'String',
								description: 'Hello world description',
								args: {
									name: {
										type: 'String',
										required: true,
									},
								},
								resolve: () => 'Hello World',
							},
						},
						mutations: {
							createMutation: {
								type: 'Boolean',
								required: true,
								args: {
									input: {
										name: {
											type: 'Int',
											required: true,
										},
									},
								},
								resolve: () => true,
							},
							customMutation: {
								type: 'Int',
								args: {
									input: {
										a: {
											type: 'Int',
											required: true,
										},
										b: {
											type: 'Int',
											required: true,
										},
									},
								},
								resolve: (_: any, args: any) =>
									args.input.a + args.input.b,
							},
							secondCustomMutation: {
								type: 'Int',
								args: {
									input: {
										sum: {
											type: 'Object',
											object: {
												name: 'Sum',
												fields: {
													a: {
														type: 'Int',
														required: true,
													},
													b: {
														type: 'Int',
														required: true,
													},
												},
											},
										},
									},
								},
								resolve: (_: any, args: any) =>
									args.input.sum.a + args.input.sum.b,
							},
						},
					},
				},
				{
					name: 'Post',
					fields: {
						name: { type: 'String', required: true },
					},
				},
			],
			scalars: [
				{
					name: 'Phone',
					description: 'Phone custom scalar type',
				},
			],
			enums: [
				{
					name: 'Role',
					values: {
						Admin: 'Admin',
						Member: 'Member',
					},
				},
			],
		},
	})

	await wibe.start()
}

run().catch((err) => {
	console.error(err)
})
