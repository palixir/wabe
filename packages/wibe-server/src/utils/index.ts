import { getSdk } from '../../generated/wibe'
import type { ClassInterface } from '../schema'
import { WibeApp } from '../server'
import { getGraphqlClient } from './helper'

export const getClient = () => {
	if (!WibeApp.config.port)
		throw new Error('WibeApp.config.port is not defined')

	const client = getGraphqlClient(WibeApp.config.port)

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

export const getClassFromClassName = (className: string): ClassInterface => {
	const classInSchema = WibeApp.config.schema.class.find(
		(schemaClass) => schemaClass.name === className
	)

	if (!classInSchema) throw new Error('Class not found in schema')

	return classInSchema
}

// TODO: Put this in wobe
export const getCookieInRequestHeaders = (
	cookieName: string,
	headers: Headers
) => {
	const cookies = headers.get('Cookie')

	if (!cookies) return

	const cookie = cookies.split(';').find((c) => c.includes(cookieName))

	if (!cookie) return

	return cookie.split('=')[1]
}
