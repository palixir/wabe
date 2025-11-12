import { describe, expect, it } from 'bun:test'
import { firstLetterInLowerCase } from '.'

describe('utils', () => {
	it('should put the first letter in lowercase', () => {
		expect(firstLetterInLowerCase('Hello')).toEqual('hello')
		expect(firstLetterInLowerCase('User')).toEqual('user')
		expect(firstLetterInLowerCase('USer')).toEqual('uSer')
		expect(firstLetterInLowerCase('99 User')).toEqual('99 user')
	})
})
