import { describe, expect, it } from 'bun:test'
import { firstLetterInLowerCase, getCookieInRequestHeaders } from '.'

describe('utils', () => {
	it('should put the first letter in lowercase', () => {
		expect(firstLetterInLowerCase('Hello')).toEqual('hello')
		expect(firstLetterInLowerCase('User')).toEqual('user')
		expect(firstLetterInLowerCase('USer')).toEqual('uSer')
		expect(firstLetterInLowerCase('99 User')).toEqual('99 user')
	})

	it('should read a cookie by exact name match', () => {
		const headers = new Headers({
			Cookie: 'foo=bar; accessToken=token123; accessTokenBackup=other',
		})

		expect(getCookieInRequestHeaders('accessToken', headers)).toEqual('token123')
	})

	it('should return undefined when duplicate cookie keys are present', () => {
		const headers = new Headers({
			Cookie: 'accessToken=token1; accessToken=token2',
		})

		expect(getCookieInRequestHeaders('accessToken', headers)).toBeUndefined()
	})
})
