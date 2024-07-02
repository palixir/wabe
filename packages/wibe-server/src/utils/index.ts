import { getSdk } from '../generated/wibe'
import type { ClassInterface } from '../schema'
import type { WibeAppTypes, WibeConfig } from '../server'
import { getGraphqlClient } from './helper'

export const getClient = (config: WibeConfig<WibeAppTypes>) => {
	if (!config.port) throw new Error('config.port is not defined')

	const client = getGraphqlClient(config.port)

	return getSdk(client)
}

export const firstLetterInLowerCase = (str: string) => {
	const indexOfFirstLetter = str.search(/[a-z]/i)

	return (
		str.slice(0, indexOfFirstLetter) +
		str[indexOfFirstLetter].toLowerCase() +
		str.slice(indexOfFirstLetter + 1)
	)
}

export const getClassFromClassName = <T extends WibeAppTypes>(
	className: string,
	config: WibeConfig<any>,
): ClassInterface<T> => {
	const classInSchema = config.schema.classes.find(
		(schemaClass) => schemaClass.name === className,
	)

	if (!classInSchema) throw new Error('Class not found in schema')

	return classInSchema
}

// TODO: Put this in wobe
export const getCookieInRequestHeaders = (
	cookieName: string,
	headers: Headers,
) => {
	const cookies = headers.get('Cookie')

	if (!cookies) return

	const cookie = cookies.split(';').find((c) => c.includes(cookieName))

	if (!cookie) return

	return cookie.split('=')[1]
}
