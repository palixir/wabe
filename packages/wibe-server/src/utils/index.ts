import { getSdk } from '../../generated/wibe'
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
