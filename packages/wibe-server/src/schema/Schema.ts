import { signInWithResolver, signUpWithResolver } from '../authentication'
import { refreshResolver } from '../authentication/resolvers/refreshResolver'
import { signOutResolver } from '../authentication/resolvers/signOutResolver'
import { verifyChallengeResolver } from '../authentication/resolvers/verifyChallenge'
import type { WibeConfig, WibeAppTypes } from '../server'
import { meResolver } from './resolvers/meResolver'

export type WibePrimaryTypes =
	| 'String'
	| 'Int'
	| 'Float'
	| 'Boolean'
	| 'Email'
	| 'Date'
	| 'File'

export type WibeCustomTypes = 'Array' | 'Object'

export type WibeRelationTypes = 'Pointer' | 'Relation'

export type WibeTypes = WibeCustomTypes | WibePrimaryTypes | WibeRelationTypes

type WibeObject<T extends WibeAppTypes> = {
	name: string
	fields: SchemaFields<T>
	description?: string
	required?: boolean
}

type TypeFieldBase<U, K extends WibeTypes> = {
	type: K
	required?: boolean
	description?: string
	defaultValue?: U
}

type TypeFieldArray<T extends WibeAppTypes> = {
	type: 'Array'
	required?: boolean
	requiredValue?: boolean
	description?: string
	defaultValue?: any[]
} & (
	| {
			// For the moment we only keep object and not array because we don't
			// support array of array
			typeValue: WibePrimaryTypes
	  }
	| { typeValue: 'Object'; object: WibeObject<T> }
)

type TypeFieldObject<T extends WibeAppTypes> = {
	type: 'Object'
	required?: boolean
	description?: string
	object: WibeObject<T>
	defaultValue?: any
}

type TypeFieldPointer<T extends WibeAppTypes> = {
	type: 'Pointer'
	required?: boolean
	description?: string
	class: keyof T['types']
}

type TypeFieldRelation<T extends WibeAppTypes> = {
	type: 'Relation'
	required?: boolean
	description?: string
	class: keyof T['types']
}

type TypeFieldFile = {
	type: 'File'
	required?: boolean
	description?: string
}

type TypeFieldCustomScalars<T extends WibeAppTypes> = {
	type: T['scalars']
	required?: boolean
	description?: string
	defaultValue?: any
}

type TypeFieldCustomEnums<T extends WibeAppTypes> = {
	type: T['enums']
	required?: boolean
	description?: string
	defaultValue?: any
}

export type TypeField<T extends WibeAppTypes> =
	| TypeFieldBase<string, 'String'>
	| TypeFieldBase<number, 'Int'>
	| TypeFieldBase<number, 'Float'>
	| TypeFieldBase<boolean, 'Boolean'>
	| TypeFieldBase<Date, 'Date'>
	| TypeFieldBase<string, 'Email'>
	| TypeFieldArray<T>
	| TypeFieldObject<T>
	| TypeFieldPointer<T>
	| TypeFieldRelation<T>
	| TypeFieldFile
	| TypeFieldCustomScalars<T>
	| TypeFieldCustomEnums<T>

export type SchemaFields<T extends WibeAppTypes> = Record<string, TypeField<T>>

export type QueryResolver<T extends WibeAppTypes> = {
	required?: boolean
	description?: string
	args?: SchemaFields<T>
	resolve: (...args: any) => any
} & (
	| { type: WibePrimaryTypes }
	| { type: 'Object'; outputObject: ClassInterface<T> }
	| { type: 'Array'; typeValue: WibePrimaryTypes }
)

export type MutationResolver<T extends WibeAppTypes> = {
	required?: boolean
	description?: string
	args?: {
		input: SchemaFields<T>
	}
	resolve: (...args: any) => any
} & (
	| { type: WibePrimaryTypes }
	| { type: 'Object'; outputObject: ClassInterface<T> }
	| { type: 'Array'; typeValue: WibePrimaryTypes }
)

export type TypeResolver<T extends WibeAppTypes> = {
	queries?: {
		[key: string]: QueryResolver<T>
	}
	mutations?: {
		[key: string]: MutationResolver<T>
	}
}

export type PermissionsOperations = 'create' | 'read' | 'update' | 'delete'

export interface PermissionProperties {
	requireAuthentication?: boolean
	// TODO : Use RoleEnum instead of string
	/**
	 * An empty array means that none role is authorized (except root client)
	 */
	authorizedRoles: Array<string>
}

export type ClassPermissions = Partial<
	Record<PermissionsOperations, PermissionProperties>
>

export type SearchableFields = Array<string>

export interface ClassInterface<T extends WibeAppTypes> {
	name: string
	fields: SchemaFields<T>
	description?: string
	permissions?: ClassPermissions
	searchableFields?: SearchableFields
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

export interface SchemaInterface<T extends WibeAppTypes> {
	classes: ClassInterface<T>[]
	scalars?: ScalarInterface[]
	enums?: EnumInterface[]
	resolvers?: TypeResolver<T>
}

export class Schema<T extends WibeAppTypes> {
	public schema: SchemaInterface<T>
	private config: WibeConfig<T>

	constructor(config: WibeConfig<T>) {
		this.config = config
		// TODO : Add default scalars here
		this.schema = {
			...config.schema,
			classes: this.defaultClass(config.schema),
			enums: [...(config.schema.enums || []), ...this.defaultEnum()],
			resolvers: this.mergeResolvers(this.defaultResolvers()),
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
			{
				name: 'SecondaryFactor',
				values: {
					EmailOTP: 'emailOTP',
				},
			},
		]
	}

	mergeResolvers(defaultResolvers: TypeResolver<T>): TypeResolver<T> {
		return {
			mutations: {
				...(this.config.schema.resolvers?.mutations || {}),
				...defaultResolvers.mutations,
			},
			queries: {
				...(this.config.schema.resolvers?.queries || {}),
				...defaultResolvers.queries,
			},
		}
	}

	defaultResolvers(): TypeResolver<T> {
		const customAuthenticationConfig =
			this.config.authentication?.customAuthenticationMethods || []

		const allSecondaryFactorAuthenticationMethods =
			customAuthenticationConfig.reduce(
				(acc, authenticationMethod) => {
					if (!authenticationMethod.isSecondaryFactor) return acc

					acc[authenticationMethod.name] = {
						type: 'Object',
						object: {
							name: authenticationMethod.name,
							fields: authenticationMethod.input,
						},
					}

					return acc
				},
				{} as SchemaFields<T>,
			)

		const allAuthenticationMethodsInput = customAuthenticationConfig.reduce(
			(acc, authenticationMethod) => {
				acc[authenticationMethod.name] = {
					type: 'Object',
					object: {
						name: authenticationMethod.name,
						fields: authenticationMethod.input,
					},
				}

				return acc
			},
			{} as SchemaFields<T>,
		)

		const authenticationInputObject: TypeFieldObject<T> = {
			type: 'Object',
			object: {
				name: 'Authentication',
				fields: allAuthenticationMethodsInput,
			},
		}

		const authenticationInput: TypeFieldObject<T> = {
			type: 'Object',
			object: {
				name: 'Authentication',
				fields: {
					// All authentication providers
					...authenticationInputObject.object.fields,
					// Secondary factor
					secondaryFactor: {
						type: 'SecondaryFactor',
						required: false,
					},
				},
			},
		}

		const challengeInputObject: TypeFieldObject<T> = {
			type: 'Object',
			object: {
				name: 'Factor',
				fields: allSecondaryFactorAuthenticationMethods,
			},
		}

		return {
			queries: {
				me: {
					type: 'Object',
					outputObject: {
						name: 'MeOutput',
						fields: {
							user: {
								type: 'Pointer',
								class: 'User',
							},
						},
					},
					resolve: meResolver,
				},
			},
			mutations: {
				...(customAuthenticationConfig.length > 0
					? {
							signInWith: {
								type: 'Object',
								outputObject: {
									name: 'SignInWithOutput',
									fields: {
										id: { type: 'String' },
										accessToken: {
											type: 'String',
										},
										refreshToken: {
											type: 'String',
										},
									},
								},
								args: {
									input: {
										authentication: authenticationInput,
									},
								},
								resolve: signInWithResolver,
							},
							signUpWith: {
								type: 'Object',
								outputObject: {
									name: 'SignUpWithOutput',
									fields: {
										id: { type: 'String' },
										accessToken: {
											type: 'String',
											required: true,
										},
										refreshToken: {
											type: 'String',
											required: true,
										},
									},
								},
								args: {
									input: {
										authentication: authenticationInput,
									},
								},
								resolve: signUpWithResolver,
							},
							signOut: {
								type: 'Boolean',
								resolve: signOutResolver,
							},
							refresh: {
								type: 'Object',
								args: {
									input: {
										accessToken: {
											type: 'String',
											required: true,
										},
										refreshToken: {
											type: 'String',
											required: true,
										},
									},
								},
								outputObject: {
									name: 'RefreshSessionOutput',
									fields: {
										accessToken: {
											type: 'String',
											required: true,
										},
										refreshToken: {
											type: 'String',
											required: true,
										},
									},
								},
								resolve: refreshResolver,
							},
							...(Object.keys(challengeInputObject.object.fields)
								.length > 0
								? {
										verifyChallenge: {
											type: 'Boolean',
											args: {
												input: {
													factor: challengeInputObject,
												},
											},
											resolve: verifyChallengeResolver,
										},
									}
								: {}),
						}
					: {}),
			},
		}
	}

	sessionClass(): ClassInterface<T> {
		return {
			name: '_Session',
			fields: {
				user: {
					type: 'Pointer',
					required: true,
					class: 'User',
				},
				accessToken: {
					type: 'String',
					required: true,
				},
				accessTokenExpiresAt: {
					type: 'Date',
					required: true,
				},
				refreshToken: {
					type: 'String',
				},
				refreshTokenExpiresAt: {
					type: 'Date',
					required: true,
				},
			},
		}
	}

	roleClass(): ClassInterface<T> {
		return {
			name: 'Role',
			fields: {
				name: {
					type: 'String',
					required: true,
				},
				users: {
					type: 'Relation',
					class: 'User',
				},
			},
		}
	}

	userClass(): ClassInterface<T> {
		const customAuthenticationConfig =
			this.config.authentication?.customAuthenticationMethods || []

		const allAuthenticationDataToStoreObject =
			customAuthenticationConfig.reduce(
				(acc, authenticationMethod) => {
					if (authenticationMethod.dataToStore)
						acc[authenticationMethod.name] = {
							type: 'Object',
							object: {
								name: authenticationMethod.name,
								fields: authenticationMethod.dataToStore,
							},
						}

					return acc
				},
				{} as SchemaFields<T>,
			)

		const authenticationObject: TypeFieldObject<T> = {
			type: 'Object',
			object: {
				name: 'Authentication',
				fields: allAuthenticationDataToStoreObject,
			},
		}

		const fields: SchemaFields<T> = {
			...(customAuthenticationConfig.length > 0
				? { authentication: authenticationObject }
				: {}),
			provider: {
				type: 'AuthenticationProvider',
			},
			isOauth: {
				type: 'Boolean',
			},
			email: {
				type: 'Email',
			},
			verifiedEmail: {
				type: 'Boolean',
			},
			role: {
				type: 'Pointer',
				class: 'Role',
			},
			sessions: {
				type: 'Relation',
				class: '_Session',
			},
		}

		return {
			name: 'User',
			fields,
			permissions: {
				delete: {
					authorizedRoles: [],
					requireAuthentication: true,
				},
				update: {
					authorizedRoles: [],
					requireAuthentication: true,
				},
				create: {
					authorizedRoles: [],
					requireAuthentication: false,
				},
				read: {
					authorizedRoles: [],
					requireAuthentication: true,
				},
			},
		}
	}

	defaultFields(): SchemaFields<T> {
		return {
			acl: {
				type: 'Object',
				object: {
					name: 'ACLObject',
					fields: {
						users: {
							type: 'Array',
							typeValue: 'Object',
							object: {
								name: 'UsersACL',
								fields: {
									userId: {
										type: 'String',
										required: true,
									},
									read: {
										type: 'Boolean',
										required: true,
									},
									write: {
										type: 'Boolean',
										required: true,
									},
								},
							},
						},
						roles: {
							type: 'Array',
							typeValue: 'Object',
							object: {
								name: 'RolesACL',
								fields: {
									roleId: {
										type: 'String',
										required: true,
									},
									read: {
										type: 'Boolean',
										required: true,
									},
									write: {
										type: 'Boolean',
										required: true,
									},
								},
							},
						},
					},
				},
			},
			createdAt: {
				type: 'Date',
			},
			updatedAt: {
				type: 'Date',
			},
			search: {
				type: 'Array',
				typeValue: 'String',
			},
		}
	}

	mergeClass(newClass: ClassInterface<T>[]): ClassInterface<T>[] {
		const allUniqueClassName = [
			...new Set(newClass.map((classItem) => classItem.name)),
		]

		return allUniqueClassName.map((uniqueClass) => {
			const allClassWithSameName = newClass.filter(
				(localClass) => localClass.name === uniqueClass,
			)

			return allClassWithSameName.reduce(
				(acc, classItem) => {
					return {
						...acc,
						...classItem,
						fields: {
							// We merge fields that have the same name and then we add the new fields
							...acc.fields,
							...classItem.fields,
							...this.defaultFields(),
						},
					}
				},
				allClassWithSameName[0] as ClassInterface<T>,
			)
		})
	}

	defaultClass(schema: SchemaInterface<T>): ClassInterface<T>[] {
		return this.mergeClass([
			...schema.classes,
			this.userClass(),
			this.sessionClass(),
			this.roleClass(),
		])
	}
}
