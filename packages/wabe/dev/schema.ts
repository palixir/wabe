import type { SchemaInterface } from '../src/schema/Schema'
import type { DevWabeTypes } from '../src/utils/helper'

export const devSchema: SchemaInterface<DevWabeTypes> = {
	classes: [
		{
			name: 'User',
			description: 'User class',
			fields: {
				name: {
					type: 'String',
				},
				age: {
					type: 'Int',
				},
			},
		},
		{
			name: 'Post',
			fields: {
				name: { type: 'String', required: true },
				test: { type: 'File' },
			},
			permissions: {
				create: {
					requireAuthentication: true,
					authorizedRoles: ['Admin'],
				},
			},
		},
	],
	scalars: [
		{
			name: 'Phone',
			description: 'Phone custom scalar type',
		},
	],
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
				resolve: (_: any, args: any) => args.input.a + args.input.b,
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
}
