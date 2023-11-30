import { describe, expect, it } from 'bun:test'
import { buildMongoWhereQuery } from './utils'

describe('Utils database adapter', () => {
	describe('MongoAdapter', () => {
		it('should build where query for mongo adapter', () => {
			const where = buildMongoWhereQuery({
				name: { equalTo: 'John' },
				age: { greaterThan: 20 },
				height: { greaterThanOrEqualTo: 1.8 },
				firstName: { notEqualTo: 'Pierre' },
				OR: {
					lastName: { equalTo: 'Smith' },
				},
			})

			expect(where).toEqual({
				name: 'John',
				firstName: { $ne: 'Pierre' },
				age: { $gt: 20 },
				height: { $gte: 1.8 },
			})
		})

		it('should build empty where query for mongoAdapter if where is empty', () => {
			const where = buildMongoWhereQuery({})

			expect(where).toEqual({})
		})

		it('should build empty where query for mongoAdapter if operation not exist', () => {
			// @ts-ignore
			const where = buildMongoWhereQuery({ name: { notExist: 'John' } })

			expect(where).toEqual({})
		})

		it('should build empty where query for mongoAdapter if operation not exist', () => {
			// @ts-ignore
			const where = buildMongoWhereQuery({ name: { notExist: 'John' } })

			expect(where).toEqual({})
		})
	})
})
