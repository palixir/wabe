import {
  AuthenticationProvider,
  signInWithResolver,
  signUpWithResolver,
} from '../authentication'
import { refreshResolver } from '../authentication/resolvers/refreshResolver'
import { signOutResolver } from '../authentication/resolvers/signOutResolver'
import { verifyChallengeResolver } from '../authentication/resolvers/verifyChallenge'
import type { WabeConfig, WabeTypes } from '../server'
import { defaultMutations, defaultQueries } from './defaultResolvers'
import type { HookObject } from '../hooks/HookObject'

export type WabePrimaryTypes =
  | 'String'
  | 'Int'
  | 'Float'
  | 'Boolean'
  | 'Email'
  | 'Phone'
  | 'Date'
  | 'File'

export type WabeCustomTypes = 'Array' | 'Object'

export type WabeRelationTypes = 'Pointer' | 'Relation'

type WabeFieldTypes = WabeCustomTypes | WabePrimaryTypes | WabeRelationTypes

export type WabeObject<T extends WabeTypes> = {
  name: string
  fields: SchemaFields<T>
  description?: string
  required?: boolean
}

type TypeFieldBase<U, K extends WabeFieldTypes> = {
  type: K
  required?: boolean
  description?: string
  defaultValue?: U
}

type TypeFieldArray<T extends WabeTypes> = {
  type: 'Array'
  required?: boolean
  requiredValue?: boolean
  description?: string
  defaultValue?: any[]
} & (
  | {
      // For the moment we only keep object and not array because we don't
      // support array of array
      typeValue: WabePrimaryTypes
    }
  | { typeValue: 'Object'; object: WabeObject<T> }
)

type TypeFieldObject<T extends WabeTypes> = {
  type: 'Object'
  required?: boolean
  description?: string
  object: WabeObject<T>
  defaultValue?: any
}

type TypeFieldPointer<T extends WabeTypes> = {
  type: 'Pointer'
  required?: boolean
  description?: string
  class: keyof T['types']
}

type TypeFieldRelation<T extends WabeTypes> = {
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

type TypeFieldCustomScalars<T extends WabeTypes> = {
  type: T['scalars']
  required?: boolean
  description?: string
  defaultValue?: any
}

type TypeFieldCustomEnums<T extends WabeTypes> = {
  type: keyof T['enums']
  required?: boolean
  description?: string
  defaultValue?: any
}

export type TypeField<T extends WabeTypes> =
  | TypeFieldBase<string, 'String'>
  | TypeFieldBase<number, 'Int'>
  | TypeFieldBase<number, 'Float'>
  | TypeFieldBase<boolean, 'Boolean'>
  | TypeFieldBase<Date, 'Date'>
  | TypeFieldBase<string, 'Email'>
  | TypeFieldBase<string, 'Phone'>
  | TypeFieldArray<T>
  | TypeFieldObject<T>
  | TypeFieldPointer<T>
  | TypeFieldRelation<T>
  | TypeFieldFile
  | TypeFieldCustomScalars<T>
  | TypeFieldCustomEnums<T>

export type SchemaFields<T extends WabeTypes> = Record<string, TypeField<T>>

export type ResolverType<T extends WabeTypes> = {
  required?: boolean
  description?: string
  resolve: (...args: any) => any
} & (
  | { type: WabePrimaryTypes | T['enums'] | T['scalars'] }
  | { type: 'Object'; outputObject: ClassInterface<T> }
  | { type: 'Array'; typeValue: WabePrimaryTypes; typeValueRequired?: boolean }
  | {
      type: 'Array'
      typeValue: 'Object'
      outputObject: ClassInterface<T>
      typeValueRequired?: boolean
    }
)

export type QueryResolver<T extends WabeTypes> = {
  args?: SchemaFields<T>
} & ResolverType<T>

export type MutationResolver<T extends WabeTypes> = {
  args?: { input: SchemaFields<T> }
} & ResolverType<T>

export type TypeResolver<T extends WabeTypes> = {
  queries?: {
    [key: string]: QueryResolver<T>
  }
  mutations?: {
    [key: string]: MutationResolver<T>
  }
}

export type PermissionsOperations = 'create' | 'read' | 'update' | 'delete'

export interface PermissionProperties<T extends WabeTypes> {
  requireAuthentication?: boolean
  /**
   * An empty array means that none role is authorized (except root client)
   */
  authorizedRoles?: Array<T['enums']['RoleEnum'] | 'everyone'>
}

/**
 * ACL properties
 * Callback to define the ACL object before insert of the object in the database
 * Can be done with a beforeCreate hook but for simplicity we can define it here
 */
export type ACLProperties = (
  hookObject: HookObject<any, any>,
) => void | Promise<void>

export type ClassPermissions<T extends WabeTypes> = Partial<
  Record<PermissionsOperations, PermissionProperties<T>> & {
    acl: ACLProperties
  }
>

export type SearchableFields = Array<string>

export type ClassIndexes = Array<{
  field: string
  order: 'ASC' | 'DESC'
  unique?: boolean
}>

export interface ClassInterface<T extends WabeTypes> {
  name: string
  fields: SchemaFields<T>
  description?: string
  permissions?: ClassPermissions<T>
  searchableFields?: SearchableFields
  indexes?: ClassIndexes
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

export interface SchemaInterface<T extends WabeTypes> {
  classes?: ClassInterface<T>[]
  scalars?: ScalarInterface[]
  enums?: EnumInterface[]
  resolvers?: TypeResolver<T>
}

export class Schema<T extends WabeTypes> {
  public schema: SchemaInterface<T>
  private config: WabeConfig<T>

  constructor(config: WabeConfig<T>) {
    this.config = config
    // TODO : Add default scalars here
    this.schema = {
      ...config.schema,
      classes: this.defaultClass(config.schema),
      enums: [...(config.schema?.enums || []), ...this.defaultEnum()],
      resolvers: this.mergeResolvers(this.defaultResolvers()),
    }
  }

  defaultEnum(): EnumInterface[] {
    return [
      {
        name: 'AuthenticationProvider',
        values: Object.fromEntries(
          Object.values(AuthenticationProvider).map((key) => [key, key]),
        ),
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
        ...(this.config.schema?.resolvers?.mutations || {}),
        ...defaultResolvers.mutations,
      },
      queries: {
        ...(this.config.schema?.resolvers?.queries || {}),
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
        required: true,
      },
      required: true,
    }

    const challengeInputObject: TypeFieldObject<T> = {
      type: 'Object',
      object: {
        name: 'Factor',
        fields: allSecondaryFactorAuthenticationMethods,
      },
    }

    return {
      queries: defaultQueries,
      mutations: {
        ...defaultMutations,
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
              ...(Object.keys(challengeInputObject.object.fields).length > 0
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
      permissions: {
        create: {
          authorizedRoles: [],
          requireAuthentication: true,
        },
        read: {
          authorizedRoles: ['everyone'],
          requireAuthentication: true,
        },
        update: {
          authorizedRoles: [],
          requireAuthentication: true,
        },
        delete: {
          authorizedRoles: [],
          requireAuthentication: true,
        },
      },
    }
  }

  internalConfigClass(): ClassInterface<T> {
    return {
      name: '_InternalConfig',
      fields: {
        configKey: {
          type: 'String',
          required: true,
        },
        configValue: {
          type: 'String',
          required: true,
        },
        description: {
          type: 'String',
        },
      },
      // Only root key
      permissions: {
        create: {
          authorizedRoles: [],
          requireAuthentication: true,
        },
        read: {
          authorizedRoles: [],
          requireAuthentication: true,
        },
        update: {
          authorizedRoles: [],
          requireAuthentication: true,
        },
        delete: {
          authorizedRoles: [],
          requireAuthentication: true,
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
            permissions:
              classItem.permissions || acc.permissions
                ? {
                    // Order is important because we put the provided schema before so we always consider
                    // the provided schema as the source of truth
                    ...classItem.permissions,
                    ...acc.permissions,
                  }
                : undefined,
          }
        },
        allClassWithSameName[0] as ClassInterface<T>,
      )
    })
  }

  defaultClass(schema?: SchemaInterface<T>): ClassInterface<T>[] {
    return this.mergeClass([
      ...(schema?.classes || []),
      this.userClass(),
      this.sessionClass(),
      this.roleClass(),
      this.internalConfigClass(),
    ])
  }
}
