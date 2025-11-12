import { randomBytes } from 'node:crypto'
import { promisify } from 'node:util'

const params = {
	parallelism: 1,
	tagLength: 64,
	memory: 65536,
	passes: 2,
}

/*
 * Hash a string with Argon2id and PHC format
 * @return : Returns the PHC format of the hashed text
 */
export const hashArgon2 = async (text: string) => {
	if (process.versions.bun)
		return Bun.password.hash(text, { algorithm: 'argon2id' })

	// Node support
	const argon2 = promisify(require('node:crypto').argon2)

	const nonce = randomBytes(16)

	const result = await argon2('argon2id', {
		message: text,
		nonce,
		...params,
	})

	return `$argon2id$v=19$m=${params.memory},t=${params.passes},p=${params.parallelism}$${nonce.toString('base64').replace(/=+$/, '')}$${result.toString('base64').replace(/=+$/, '')}`
}

/*
 * Verify if a hash matchs with a string
 * @return : Returns true if the password matchs with the hash, false otherwise
 */
export const verifyArgon2 = async (password: string, hash: string) => {
	if (process.versions.bun)
		return Bun.password.verify(password, hash, 'argon2id')

	// Node support
	const [, algorithm, , paramString, nonceHex, storedHashHex] = hash.split('$')

	const kvPairs = paramString?.split(',')
	const parsedParams = Object.fromEntries(
		kvPairs?.map((pair) => {
			const [key, value] = pair.split('=')
			return [key, Number.parseInt(value || '', 10)]
		}) || [],
	)

	const memory = parsedParams.m
	const passes = parsedParams.t
	const parallelism = parsedParams.p

	const newDerived = await promisify(require('node:crypto'))(algorithm, {
		nonce: Buffer.from(nonceHex || '', 'base64'),
		parallelism,
		tagLength: 64,
		memory,
		passes,
		message: password,
	})

	const isMatch = crypto.timingSafeEqual(
		Buffer.from(newDerived),
		Buffer.from(storedHashHex || '', 'base64'),
	)

	return isMatch
}

export const isArgon2Hash = (value: string): boolean =>
	typeof value === 'string' && value.startsWith('$argon2')
