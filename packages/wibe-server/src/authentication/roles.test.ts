import { beforeAll, describe, expect, it, mock, afterEach } from 'bun:test'
import { WibeApp } from '..'
import { initializeRoles } from './roles'

describe('Roles', () => {
	const mockCreateObjects = mock(() => {})

	const databaseController = {
		createObjects: mockCreateObjects,
	} as any

	beforeAll(() => {
		WibeApp.config = {
			authentication: {
				roles: ['Role1', 'Role2'],
			},
		} as any
	})

	afterEach(() => {
		mockCreateObjects.mockClear()
	})

	it('should create all roles', async () => {
		await initializeRoles(databaseController)

		expect(mockCreateObjects).toHaveBeenCalledTimes(1)
		expect(mockCreateObjects).toHaveBeenCalledWith({
			className: 'Role',
			context: { isRoot: true, databaseController },
			data: [{ name: 'Role1' }, { name: 'Role2' }],
		})
	})

	it('should call database if there is no roles', async () => {
		WibeApp.config = {
			authentication: {
				roles: [],
			},
		} as any

		await initializeRoles(databaseController)

		expect(mockCreateObjects).toHaveBeenCalledTimes(0)
	})
})
