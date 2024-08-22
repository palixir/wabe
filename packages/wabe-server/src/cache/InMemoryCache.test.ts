import { describe, expect, it, beforeEach, spyOn } from 'bun:test'
import { InMemoryCache } from './InMemoryCache'

describe('InMemoryCache', () => {
	const inMemoryCache = new InMemoryCache({
		interval: 100,
	})

	beforeEach(() => {
		inMemoryCache.clear()
	})

	it('should init a InMemoryCache', () => {
		const spySetInterval = spyOn(global, 'setInterval')
		const spyClearInterval = spyOn(global, 'clearInterval')

		const store = new InMemoryCache({ interval: 100 })

		store.stop()

		expect(spySetInterval).toHaveBeenCalledTimes(1)
		expect(spySetInterval).toHaveBeenCalledWith(expect.any(Function), 100)
		expect(spyClearInterval).toHaveBeenCalledTimes(1)
		expect(spyClearInterval).toHaveBeenCalledWith(store.intervalId)
	})

	it('should store a value', () => {
		inMemoryCache.set('key', 'value')

		expect(inMemoryCache.get('key')).toBe('value')
	})

	it('should clear an in memory cache', () => {
		inMemoryCache.set('key', 'value')

		expect(inMemoryCache.get('key')).toBe('value')

		inMemoryCache.clear()

		expect(inMemoryCache.get('key')).toBeUndefined()
	})

	it('should return undefined if the key does not exist', () => {
		expect(inMemoryCache.get('key2')).toBeUndefined()
	})

	it('should clear a cache after timeLimit', () => {
		const localInMemoryCache = new InMemoryCache({
			interval: 100,
		})

		localInMemoryCache.set('key', 'value')

		setTimeout(() => {
			expect(localInMemoryCache.get('key')).not.toBeUndefined()
		}, 50)

		setTimeout(() => {
			expect(localInMemoryCache.get('key')).toBeUndefined()
		}, 100)
	})
})
