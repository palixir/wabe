import * as wabeFile from '../../generated/wabe'
import type { ClassInterface } from '../schema'
import type { WabeAppTypes, WabeConfig } from '../server'
import { getGraphqlClient } from './helper'

export const getClient = (config: WabeConfig<WabeAppTypes>) => {
	// We do this to avoid failing import when wabe.ts is not already generated
	// @ts-ignore
	const getSdk = wabeFile.getSdk

	if (!getSdk) return

	if (!config.port) throw new Error('config.port is not defined')

	const client = getGraphqlClient(config.port)

	return getSdk(client)
}

export const firstLetterInUpperCase = (str: string) => {
	const indexOfFirstLetter = str.search(/[a-z]/i)

	return (
		str.slice(0, indexOfFirstLetter) +
		str[indexOfFirstLetter].toUpperCase() +
		str.slice(indexOfFirstLetter + 1)
	)
}

export const firstLetterInLowerCase = (str: string) => {
	const indexOfFirstLetter = str.search(/[a-z]/i)

	return (
		str.slice(0, indexOfFirstLetter) +
		str[indexOfFirstLetter].toLowerCase() +
		str.slice(indexOfFirstLetter + 1)
	)
}

export const getClassFromClassName = <T extends WabeAppTypes>(
	className: string,
	config: WabeConfig<any>,
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

/**
 * This apply the following transformations on string:
 * - lowercase
 * - normalize with NFD
 * - remove diacritics and accents characters
 * - replace matching abbreviation with long version (if disableAbbrevations is not set)
 * - replace 2 or more spaces by one
 * - replace all non alpha characters by a space
 * - trim
 */
export const tokenize = (value: string) => {
	const tmpValue = value
		.toLowerCase()
		.normalize('NFD')
		// biome-ignore lint/suspicious/noMisleadingCharacterClass:
		.replace(/[\u0300-\u036f]/g, '')
		.replace(/\s\s+/g, ' ')

	return (
		tmpValue
			// Replace all non alpha
			.replace(/[\W_]+/g, ' ')
			.trim()
	)
}
