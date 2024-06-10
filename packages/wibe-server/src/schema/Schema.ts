import type {
	WibeSchemaScalars,
	WibeSchemaEnums,
	WibeSchemaTypes,
} from '../../generated/wibe'
import { signInWithResolver, signUpWithResolver } from '../authentication'
import { refreshResolver } from '../authentication/resolvers/refreshResolver'
import { signOutResolver } from '../authentication/resolvers/signOutResolver'
import { verifyChallengeResolver } from '../authentication/resolvers/verifyChallenge'
import { WibeApp } from '../server'

export type WibePrimaryTypes =
	| 'String'
	| 'Int'
	| 'Float'
	| 'Boolean'
	| 'Email'
	| 'Date'

export type WibeCustomTypes = 'Array' | 'Object'

export type WibeRelationTypes = 'Pointer' | 'Relation'

export type WibeTypes =
	| WibeSchemaScalars
	| WibeSchemaEnums
	| WibeCustomTypes
	| WibePrimaryTypes
	| WibeRelationTypes

export type WibeGraphQLType =
	| WibePrimaryTypes
	| WibeCustomTypes
	| WibeSchemaEnums
	| WibeSchemaScalars

type TypeFieldBase<T, K extends WibeTypes> = {
	type: K | WibeSchemaScalars | WibeSchemaEnums
	required?: boolean
	description?: string
	defaultValue?: T
}

type TypeFieldArray = {
	type: 'Array'
	required?: boolean
	description?: string
	defaultValue?: any[]
	typeValue: WibePrimaryTypes
}

type TypeFieldObject = {
	type: 'Object'
	required?: boolean
	description?: string
	object: ClassInterface
	defaultValue?: any
}

type TypeFieldPointer = {
	type: 'Pointer'
	required?: boolean
	description?: string
	class: keyof WibeSchemaTypes
}

type TypeFieldRelation = {
	type: 'Relation'
	required?: boolean
	description?: string
	class: keyof WibeSchemaTypes
}

export type TypeField =
	| TypeFieldBase<string, 'String'>
	| TypeFieldBase<number, 'Int'>
	| TypeFieldBase<number, 'Float'>
	| TypeFieldBase<boolean, 'Boolean'>
	| TypeFieldBase<Date, 'Date'>
	| TypeFieldBase<string, 'Email'>
	| TypeFieldArray
	| TypeFieldObject
	| TypeFieldPointer
	| TypeFieldRelation

export type SchemaFields = Record<string, TypeField>

export type QueryResolver = {
	type: WibePrimaryTypes
	required?: boolean
	description?: string
	args?: {
		[key: string]: TypeField
	}
	resolve: (...args: any) => any
}

export type MutationResolver = {
	required?: boolean
	description?: string
	args?: {
		input: {
			[key: string]: TypeField
		}
	}
	resolve: (...args: any) => any
} & (
	| { type: WibePrimaryTypes }
	| { type: 'Object'; outputObject: ClassInterface }
	| { type: 'Array'; typeValue: WibePrimaryTypes }
)

export type TypeResolver = {
	queries?: {
		[key: string]: QueryResolver
	}
	mutations?: {
		[key: string]: MutationResolver
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

export type Permissions = Partial<
	Record<PermissionsOperations, PermissionProperties>
>

export interface ClassInterface {
	name: string
	fields: SchemaFields
	description?: string
	resolvers?: TypeResolver
	permissions?: Permissions
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
		// TODO : Add default scalars here
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
			{
				name: 'SecondaryFactor',
				values: {
					EmailOTP: 'emailOTP',
				},
			},
		]
	}

	_sessionClass(): ClassInterface {
		return {
			name: '_Session',
			fields: {
				user: {
					type: 'Pointer',
					required: true,
					class: '_User',
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
				createdAt: {
					type: 'Date',
					required: true,
				},
				updatedAt: {
					type: 'Date',
					required: true,
				},
			},
		}
	}

	_roleClass(): ClassInterface {
		return {
			name: '_Role',
			fields: {
				name: {
					type: 'String',
					required: true,
				},
				users: {
					type: 'Relation',
					class: '_User',
				},
			},
		}
	}

	_userClass(): ClassInterface {
		const customAuthenticationConfig =
			WibeApp.config?.authentication?.customAuthenticationMethods || []

		const allAuthenticationMethods = customAuthenticationConfig.reduce(
			(acc, authenticationMethod) => {
				acc[authenticationMethod.name] = {
					type: 'Object',
					object: {
						name: authenticationMethod.name,
						fields: {
							...authenticationMethod.input,
						},
					},
				}

				return acc
			},
			{} as SchemaFields,
		)

		const allSecondaryFactorAuthenticationMethods =
			customAuthenticationConfig.reduce((acc, authenticationMethod) => {
				if (!authenticationMethod.isSecondaryFactor) return acc

				acc[authenticationMethod.name] = {
					type: 'Object',
					object: {
						name: authenticationMethod.name,
						fields: {
							...authenticationMethod.input,
						},
					},
				}

				return acc
			}, {} as SchemaFields)

		const authenticationObject: TypeFieldObject = {
			type: 'Object',
			object: {
				name: 'Authentication',
				fields: {
					...allAuthenticationMethods,
				},
			},
		}

		const fields: SchemaFields = {
			...(customAuthenticationConfig.length > 0
				? { authentication: authenticationObject }
				: {}),
			provider: {
				type: 'AuthenticationProvider',
			},
			email: {
				type: 'Email',
			},
			verifiedEmail: {
				type: 'Boolean',
			},
			role: {
				type: 'Pointer',
				class: '_Role',
			},
			// TODO : Automatically put this two fields for each class
			createdAt: {
				type: 'Date',
			},
			updatedAt: {
				type: 'Date',
			},
		}

		const authenticationInput: TypeFieldObject = {
			type: 'Object',
			object: {
				name: 'Authentication',
				fields: {
					// All authentication providers
					...authenticationObject.object.fields,
					// Secondary factor
					secondaryFactor: {
						type: 'SecondaryFactor',
						required: false,
					},
				},
			},
		}

		const challengeInputObject: TypeFieldObject = {
			type: 'Object',
			object: {
				name: 'Factor',
				fields: {
					...allSecondaryFactorAuthenticationMethods,
				},
			},
		}

		const resolvers: TypeResolver = {
			mutations: {
				...(customAuthenticationConfig.length > 0
					? {
							signInWith: {
								type: 'Object',
								outputObject: {
									name: 'SignInWithOutput',
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
								type: 'Boolean',
								resolve: signOutResolver,
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

		return {
			name: '_User',
			fields,
			resolvers,
		}
	}

	mergeClass(newClass: ClassInterface[]): ClassInterface[] {
		const allUniqueClassName = [
			...new Set(newClass.map((classItem) => classItem.name)),
		]

		return allUniqueClassName.map((uniqueClass) => {
			const allClassWithSameName = newClass.filter(
				(localClass) => localClass.name === uniqueClass,
			)

			return allClassWithSameName.reduce((acc, classItem) => {
				const resolvers: TypeResolver = {
					mutations: {
						...acc.resolvers?.mutations,
						...classItem.resolvers?.mutations,
					},
					queries: {
						...acc.resolvers?.queries,
						...classItem.resolvers?.queries,
					},
				}

				const isMutationsEmpty =
					Object.keys(resolvers.mutations || {}).length > 0
				const isQueriesEmpty =
					Object.keys(resolvers.queries || {}).length > 0

				return {
					...acc,
					...classItem,
					fields: {
						// We merge fields that have the same name and then we add the new fields
						...acc.fields,
						...classItem.fields,
						// ...mergeField(classItem.fields, acc.fields),
					},
					resolvers:
						isQueriesEmpty || isMutationsEmpty
							? {
									mutations: isMutationsEmpty
										? resolvers.mutations
										: undefined,
									queries: isQueriesEmpty
										? resolvers.queries
										: undefined,
								}
							: undefined,
				}
			}, allClassWithSameName[0] as ClassInterface)
		})
	}

	defaultClass(schema: SchemaInterface): ClassInterface[] {
		return this.mergeClass([
			...schema.class,
			this._userClass(),
			this._sessionClass(),
			this._roleClass(),
		])
	}
}
