import { describe, expect, it } from 'bun:test'
import { buildMongoWhereQuery } from './utils'

describe('Utils database adapter', () => {
	describe('Mongo', () => {
		it('should build where query for mongo adapter', () => {
			const where = buildMongoWhereQuery<'User'>({
				name: { equalTo: 'John' },
				age: { greaterThan: 20 },
				OR: [
					{
						age: { lessThan: 10 },
					},
					{ name: { equalTo: 'John' } },
					{
						OR: [
							{
								name: { equalTo: 'Tata' },
							},
						],
					},
				],
				AND: [
					{
						age: { lessThan: 10 },
					},
					{ name: { equalTo: 'John' } },
					{
						AND: [
							{
								name: { equalTo: 'Tata' },
							},
						],
					},
				],
			})

			expect(where).toEqual({
				name: 'John',
				age: { $gt: 20 },
				$or: [
					{ age: { $lt: 10 } },
					{ name: 'John' },
					{ $or: [{ name: 'Tata' }] },
				],
				$and: [
					{ age: { $lt: 10 } },
					{ name: 'John' },
					{ $and: [{ name: 'Tata' }] },
				],
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
