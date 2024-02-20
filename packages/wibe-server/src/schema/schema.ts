import { WibeSchemaScalars, WibeSchemaEnums } from '../../generated/wibe'
import { signInWithResolver } from '../authentication/signInWithResolver'
import { signInResolver } from '../graphql/resolvers/signIn'
import { signInWithProviderResolver } from '../graphql/resolvers/signInWithProvider'
import { signOutResolver } from '../graphql/resolvers/signOut'
import { signUpResolver } from '../graphql/resolvers/signUp'

export type WibeDefaultTypes =
	| 'String'
	| 'Int'
	| 'Float'
	| 'Boolean'
	| 'Date'
	| 'Email'
	| 'Array'
	| 'Object'

export type WibeTypes = WibeSchemaScalars | WibeSchemaEnums | WibeDefaultTypes

type TypeFieldBase<T, K extends WibeTypes> = {
	type: K | WibeSchemaScalars | WibeSchemaEnums
	required?: boolean
	description?: string
	defaultValue?: T
}

export type TypeField =
	| TypeFieldBase<string, 'String'>
	| TypeFieldBase<number, 'Int'>
	| TypeFieldBase<number, 'Float'>
	| TypeFieldBase<boolean, 'Boolean'>
	| TypeFieldBase<Date, 'Date'>
	| TypeFieldBase<string, 'Email'>
	| {
			type: 'Array'
			required?: boolean
			description?: string
			defaultValue?: any[]
			typeValue: WibeTypes
	  }
	| {
			type: 'Object'
			required?: boolean
			description?: string
			object: ClassInterface
	  }

export type SchemaFields = Record<string, TypeField>

export type QueryResolver = {
	type: WibeTypes
	required?: boolean
	description?: string
	args?: {
		[key: string]: TypeField
	}
	resolve: (...args: any) => any
}

export type MutationResolver = {
	type: WibeTypes
	required?: boolean
	description?: string
	args?: {
		input: {
			[key: string]: TypeField
		}
	}
	resolve: (...args: any) => any
}

export type TypeResolver = {
	queries?: {
		[key: string]: QueryResolver
	}
	mutations?: {
		[key: string]: MutationResolver
	}
}

export interface ClassInterface {
	name: string
	fields: SchemaFields
	description?: string
	resolvers?: TypeResolver
}

export interface ScalarInterface {
	name: string
	description?: string
	parseValue?: (value: any) => any
	serialize?: (value: any) => any
	parseLiteral?: (ast: any) => any
}

export interface EnumInterface {
	name: string
	values: Record<string, string>
	description?: string
}

export interface SchemaInterface {
	class: ClassInterface[]
	scalars?: ScalarInterface[]
	enums?: EnumInterface[]
}

export class Schema {
	public schema: SchemaInterface

	constructor(schema: SchemaInterface) {
		this.schema = {
			...schema,
			class: this.defaultClass(schema),
			enums: [...(schema.enums || []), ...this.defaultEnum()],
		}
	}

	defaultEnum(): EnumInterface[] {
		return [
			{
				name: 'AuthenticationProvider',
				values: {
					Google: 'Google',
				},
			},
		]
	}

	defaultClass(schema: SchemaInterface): ClassInterface[] {
		const defaultUserFields: SchemaFields = {
			provider: {
				type: 'AuthenticationProvider',
			},
			email: {
				type: 'Email',
			},
			verifiedEmail: {
				type: 'Boolean',
			},
			// TODO : Automatically put this two fields for each class
			createdAt: {
				type: 'Date',
			},
			updatedAt: {
				type: 'Date',
			},
		}

		const defaultResolvers: TypeResolver = {
			mutations: {
				signInWith: {
					type: 'Boolean',
					args: {
						input: {
							emailPassword: {
								type: 'Object',
								object: {
									name: 'EmailPassword',
									fields: {
										identifier: {
											type: 'Email',
											required: true,
										},
										password: {
											type: 'String',
											required: true,
										},
									},
								},
							},
						},
					},
					resolve: signInWithResolver,
				},
				signOut: {
					type: 'Boolean',
					resolve: signOutResolver,
					args: {
						input: {
							email: {
								type: 'Email',
								required: true,
							},
						},
					},
				},
				signUp: {
					type: 'Boolean',
					args: {
						input: {
							email: {
								type: 'Email',
								required: true,
							},
							password: {
								type: 'String',
								required: true,
							},
						},
					},
					resolve: signUpResolver,
				},
				signIn: {
					type: 'Boolean',
					args: {
						input: {
							email: {
								type: 'Email',
								required: true,
							},
							password: {
								type: 'String',
								required: true,
							},
						},
					},
					resolve: signInResolver,
				},
				signInWithProvider: {
					type: 'Boolean',
					args: {
						input: {
							provider: {
								type: 'AuthenticationProvider',
								required: true,
							},
							email: {
								type: 'Email',
								required: true,
							},
							verifiedEmail: {
								type: 'Boolean',
								required: true,
							},
							accessToken: {
								type: 'String',
								required: true,
							},
							refreshToken: {
								type: 'String',
							},
						},
					},
					resolve: signInWithProviderResolver,
				},
			},
		}

		const _userIndex = schema.class.findIndex(
			(wibeClass) => wibeClass.name === '_User',
		)

		if (_userIndex !== -1) {
			const _user = schema.class[_userIndex]

			const newUserObject = {
				name: _user.name,
				description: _user.description,
				fields: {
					..._user.fields,
					...defaultUserFields,
				},
				resolvers: {
					queries: {
						..._user.resolvers?.queries,
						...defaultResolvers.queries,
					},
					mutations: {
						..._user.resolvers?.mutations,
						...defaultResolvers.mutations,
					},
				},
			}

			const newArrayOfClassWithoutThe_User = [
				...schema.class.slice(0, _userIndex),
				...schema.class.slice(_userIndex + 1),
			]

			return [...newArrayOfClassWithoutThe_User, newUserObject]
		}

		return [
			...schema.class,
			{
				name: '_User',
				fields: {
					...defaultUserFields,
				},
				resolvers: {
					...defaultResolvers,
				},
			},
		]
	}
}
