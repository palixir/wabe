import { describe, expect, it } from 'bun:test'
import { base64URLencode } from './utils'

describe('Oauth utils', () => {
	it('should encode url with base64', () => {
		const content = 'test'

		const hasher = new Bun.CryptoHasher('sha256')
		hasher.update(new TextEncoder().encode('test'))
		const resultWithPadding = hasher.digest('base64')

		const result = base64URLencode(content)

		expect(resultWithPadding).toBe(
			'n4bQgYhMfWWaL+qgxVrQFaO/TxsrC4Is0V1sFbDwCgg=',
		)
		expect(result).toBe('n4bQgYhMfWWaL-qgxVrQFaO_TxsrC4Is0V1sFbDwCgg')
	})
})
