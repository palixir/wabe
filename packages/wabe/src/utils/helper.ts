import { gql, GraphQLClient } from 'graphql-request'
import {
	type User as GeneratedUser,
	type WhereUser as GeneratedWhereUser,
	type WabeSchemaWhereTypes,
	type WabeSchemaEnums,
	type WabeSchemaScalars,
	type WabeSchemaTypes,
} from '../../generated/wabe'
import type { Wabe, WabeTypes } from '../server'
import { defaultPrivateFields } from 'src/schema'

/** Extra User fields declared in setupTests() but absent from dev codegen output. */
type DevTestUserFields = {
	name?: string
	age?: number
	avatar?: {
		name: string
		url?: string
		urlGeneratedAt?: string
		isPresignedUrl: boolean
	}
	isAdmin?: boolean
	floatValue?: number
	birthDate?: string | Date
	arrayValue?: string[]
	test?: string
}

type DevTestWhereUserFields = {
	name?: string
	age?: number
	isAdmin?: boolean
	floatValue?: number
	birthDate?: Date
	arrayValue?: string[]
	test?: string
}

export interface DevWabeTypes extends WabeTypes {
	types: Omit<WabeSchemaTypes, 'User'> & {
		User: GeneratedUser & DevTestUserFields
	}
	scalars: WabeSchemaScalars
	enums: WabeSchemaEnums
	where: Omit<WabeSchemaWhereTypes, 'User'> & {
		User: GeneratedWhereUser & DevTestWhereUserFields
	}
}

export const selectFieldsWithoutPrivateFields = <T extends Record<string, any>>(select?: T): T =>
	Object.entries(select || {}).reduce((acc, [key, value]) => {
		if (defaultPrivateFields.includes(key)) return acc

		return {
			...acc,
			[key]: value,
		}
	}, {} as T)

export const firstLetterUpperCase = (str: string): string =>
	str.charAt(0).toUpperCase() + str.slice(1)

export const getGraphqlClient = (port: number, rootKey = 'dev'): GraphQLClient => {
	const client = new GraphQLClient(`http://127.0.0.1:${port}/graphql`, {
		headers: {
			'Wabe-Root-Key': rootKey,
		},
	})

	return { ...client, request: client.request<any> } as GraphQLClient
}

export const getAnonymousClient = (port: number): GraphQLClient => {
	const client = new GraphQLClient(`http://127.0.0.1:${port}/graphql`)

	return { ...client, request: client.request<any> } as GraphQLClient
}

export const getUserClient = (
	port: number,
	options: {
		accessToken?: string
		csrfToken?: string
		// When true, the access token is sent through the `accessToken` cookie instead of the
		// `Wabe-Access-Token` header. This is required to exercise CSRF protection, which only
		// applies to tokens coming from the cookie.
		useCookie?: boolean
	},
): GraphQLClient => {
	const headers: Record<string, string> = {
		'Wabe-Csrf-Token': options.csrfToken || '',
	}

	if (options.useCookie) {
		if (options.accessToken) headers.Cookie = `accessToken=${options.accessToken}`
	} else {
		headers['Wabe-Access-Token'] = options.accessToken || ''
	}

	const client = new GraphQLClient(`http://127.0.0.1:${port}/graphql`, {
		headers,
	})

	return { ...client, request: client.request<any> } as GraphQLClient
}

export const getAdminUserClient = async (
	port: number,
	wabe: Wabe<DevWabeTypes>,
	{ email, password }: { email: string; password: string },
): Promise<GraphQLClient> => {
	const roles = await wabe.controllers.database.getObjects({
		className: 'Role',
		context: {
			isRoot: true,
			wabe,
		} as any,
		select: { id: true },
		where: {
			name: { equalTo: 'Admin' },
		},
	})

	const adminRoleId = roles[0]?.id

	const res = await getGraphqlClient(port).request<any>(
		gql`
			mutation signUpWith($input: SignUpWithInput!) {
				signUpWith(input: $input) {
					id
					accessToken
				}
			}
		`,
		{
			input: {
				authentication: {
					emailPassword: {
						email,
						password,
					},
				},
			},
		},
	)

	const accessToken = res.signUpWith.accessToken
	const userId = res.signUpWith.id

	await wabe.controllers.database.updateObjects({
		className: 'User',
		context: {
			isRoot: true,
			wabe,
		} as any,
		data: {
			role: adminRoleId,
		},
		select: {},
		where: {
			id: { equalTo: userId },
		},
	})

	const client = new GraphQLClient(`http://127.0.0.1:${port}/graphql`, {
		headers: {
			'Wabe-Access-Token': accessToken,
		},
	})

	return { ...client, request: client.request<any> } as GraphQLClient
}

export const createUserAndUpdateRole = async ({
	anonymousClient,
	rootClient,
	roleName,
	port,
	email,
}: {
	port: number
	anonymousClient: GraphQLClient
	rootClient: GraphQLClient
	roleName: string
	email?: string
}) => {
	const random = Math.random().toString(36).substring(2)

	const res = await anonymousClient.request<any>(
		gql`
			mutation signUpWith($input: SignUpWithInput!) {
				signUpWith(input: $input) {
					id
					accessToken
					refreshToken
				}
			}
		`,
		{
			input: {
				authentication: {
					emailPassword: {
						email: email || `email${random}@test.fr`,
						password: 'password',
					},
				},
			},
		},
	)

	const resOfRoles = await rootClient.request<any>(gql`
			query getRoles {
					roles(where: {name: {equalTo: "${roleName}"}}) {
			    edges {
		    			node {
		     			 	id
		    			}
		  			}
					}
			}
		`)

	const roleId = resOfRoles.roles.edges[0].node.id

	await rootClient.request<any>(gql`
			mutation updateUser {
			  updateUser(input: {id: "${res.signUpWith.id}", fields: {role: {link: "${roleId}"}}}) {
		  			user {
		    			id
		  			}
					}
			}
		`)

	const userClient = getUserClient(port, {
		accessToken: res.signUpWith.accessToken,
	})

	return {
		userClient,
		roleId,
		userId: res.signUpWith.id,
		refreshToken: res.signUpWith.refreshToken,
		accessToken: res.signUpWith.accessToken,
	}
}
