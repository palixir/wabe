import { describe, expect, it, mock, afterEach } from 'bun:test'
import { initializeRoles } from './roles'

describe('Roles', () => {
	const mockCreateObjects = mock(() => {})

	const databaseController = {
		createObjects: mockCreateObjects,
	} as any

	const config = {
		authentication: {
			roles: ['Role1', 'Role2'],
		},
	} as any

	afterEach(() => {
		mockCreateObjects.mockClear()
	})

	it('should create all roles', async () => {
		await initializeRoles(databaseController, config)

		expect(mockCreateObjects).toHaveBeenCalledTimes(1)
		expect(mockCreateObjects).toHaveBeenCalledWith({
			className: 'Role',
			context: { isRoot: true, wibe: { databaseController, config } },
			data: [{ name: 'Role1' }, { name: 'Role2' }],
		})
	})

	it('should call database if there is no roles', async () => {
		await initializeRoles(databaseController, {
			authentication: { roles: [] },
		} as any)

		expect(mockCreateObjects).toHaveBeenCalledTimes(0)
	})
})
