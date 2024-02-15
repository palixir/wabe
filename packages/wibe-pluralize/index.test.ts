import { describe, expect, it } from 'bun:test'
import { pluralize } from './index'

describe('Pluralize', () => {
	it('should pluralize a simple noun', () => {
		expect(pluralize('cat')).toBe('cats')
		expect(pluralize('boat')).toBe('boats')
	})

	it('should pluralize a noun ending by s,x,z,ch,sh', () => {
		expect(pluralize('bus')).toBe('buses')
		expect(pluralize('box')).toBe('boxes')
		expect(pluralize('buzz')).toBe('buzzes')
		expect(pluralize('church')).toBe('churches')
		expect(pluralize('wish')).toBe('wishes')
	})

	it('should pluralize a noun ending in a consonant and then y', () => {
		expect(pluralize('baby')).toBe('babies')
		expect(pluralize('story')).toBe('stories')
		expect(pluralize('city')).toBe('cities')
		expect(pluralize('penny')).toBe('pennies')
	})

	it('should pluralize an irregular noun', () => {
		expect(pluralize('child')).toBe('children')
		expect(pluralize('goose')).toBe('geese')
		expect(pluralize('potato')).toBe('potatoes')
		expect(pluralize('radius')).toBe('radii')
		expect(pluralize('parenthesis')).toBe('parentheses')
	})
})
