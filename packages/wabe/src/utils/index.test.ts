import { describe, expect, it } from 'bun:test'
import {
	firstLetterInUpperCase,
	firstLetterInLowerCase,
	getCookieInRequestHeaders,
	getNewObjectAfterUpdateNestedProperty,
} from '.'
import { isUnsafeObjectKey } from './objectKeys'

describe('utils', () => {
	it('should put the first letter in lowercase', () => {
		expect(firstLetterInLowerCase('Hello')).toEqual('hello')
		expect(firstLetterInLowerCase('User')).toEqual('user')
		expect(firstLetterInLowerCase('USer')).toEqual('uSer')
		expect(firstLetterInLowerCase('99 User')).toEqual('99 user')
		expect(firstLetterInLowerCase('12345')).toEqual('12345')
		expect(firstLetterInLowerCase('')).toEqual('')
	})

	it('should put the first letter in uppercase', () => {
		expect(firstLetterInUpperCase('hello')).toEqual('Hello')
		expect(firstLetterInUpperCase('99 user')).toEqual('99 User')
		expect(firstLetterInUpperCase('12345')).toEqual('12345')
		expect(firstLetterInUpperCase('')).toEqual('')
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

	it('should identify unsafe object keys', () => {
		expect(isUnsafeObjectKey('__proto__')).toBeTrue()
		expect(isUnsafeObjectKey('prototype')).toBeTrue()
		expect(isUnsafeObjectKey('constructor')).toBeTrue()
		expect(isUnsafeObjectKey('safeField')).toBeFalse()
	})

	it('should prevent prototype pollution via path-based updates', () => {
		const object = {}

		getNewObjectAfterUpdateNestedProperty(object, '__proto__.polluted', 'yes')
		getNewObjectAfterUpdateNestedProperty(object, 'constructor.prototype.polluted', 'yes')

		expect(({} as any).polluted).toBeUndefined()
		expect((object as any).polluted).toBeUndefined()
	})
})
