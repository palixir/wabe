import { beforeAll, describe, expect, it, mock, afterEach } from 'bun:test'
import { WibeApp } from '..'
import { initializeRoles } from './roles'

describe('Roles', () => {
	const mockCreateObjects = mock(() => {})

	beforeAll(() => {
		WibeApp.databaseController = {
			createObjects: mockCreateObjects,
		} as any

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
		await initializeRoles()

		expect(mockCreateObjects).toHaveBeenCalledTimes(1)
		expect(mockCreateObjects).toHaveBeenCalledWith({
			className: '_Role',
			context: { isRoot: true },
			data: [{ name: 'Role1' }, { name: 'Role2' }],
		})
	})

	it('should call database if there is no roles', async () => {
		WibeApp.config = {
			authentication: {
				roles: [],
			},
		} as any

		await initializeRoles()

		expect(mockCreateObjects).toHaveBeenCalledTimes(0)
	})
})
