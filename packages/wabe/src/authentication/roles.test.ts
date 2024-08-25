import { describe, expect, it, mock, afterEach } from 'bun:test'
import { initializeRoles } from './roles'

describe('Roles', () => {
	const mockCreateObjects = mock(() => {})

	const wabe = {
		config: {
			authentication: {
				roles: ['Role1', 'Role2'],
			},
		},
		controllers: {
			database: {
				createObjects: mockCreateObjects,
			},
		},
	} as any

	afterEach(() => {
		mockCreateObjects.mockClear()
	})

	it('should create all roles', async () => {
		await initializeRoles(wabe)

		expect(mockCreateObjects).toHaveBeenCalledTimes(1)
		expect(mockCreateObjects).toHaveBeenCalledWith({
			className: 'Role',
			context: { isRoot: true, wabe: wabe },
			data: [{ name: 'Role1' }, { name: 'Role2' }],
			fields: [],
		})
	})

	it('should call database if there is no roles', async () => {
		await initializeRoles({
			controllers: {
				database: {
					createObjects: mockCreateObjects,
				},
			},
			authentication: {
				roles: [],
			},
		} as any)

		expect(mockCreateObjects).toHaveBeenCalledTimes(0)
	})
})
