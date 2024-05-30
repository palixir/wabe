import { describe, expect, it, beforeAll, beforeEach, mock } from 'bun:test'
import {
	_getPermissionPropertiesOfAClass,
	_checkPermissions,
} from './permissions'
import { WibeApp } from '../..'
import { HookObject } from './HookObject'
import { OperationType } from '.'
import { Context } from '../graphql/interface'

describe('Permissions', () => {
	const mockGetObject = mock(() => {})

	beforeAll(() => {
		// @ts-expect-error
		WibeApp.config = {
			schema: {
				class: [
					{
						name: 'TestClass',
						fields: {
							field1: { type: 'String' },
						},
						permissions: {
							read: {
								requireAuthentication: true,
							},
						},
					},
					{
						name: 'TestClass2',
						fields: {
							field2: { type: 'String' },
						},
					},
				],
			},
		}

		WibeApp.databaseController = {
			// @ts-expect-error
			getObject: mockGetObject,
		}
	})

	beforeEach(() => {
		mockGetObject.mockClear()
	})

	it('should get the permission for a given className', async () => {
		const permission = await _getPermissionPropertiesOfAClass({
			className: 'TestClass',
			operation: 'read',
		})

		expect(permission).toEqual({ requireAuthentication: true })

		const permission2 = await _getPermissionPropertiesOfAClass({
			className: 'TestClass2',
			operation: 'read',
		})

		expect(permission2).toBeUndefined()
	})

	it('should throw permission denied if no session id is provided but class require authentication', async () => {
		const obj = new HookObject({
			// @ts-expect-error
			className: 'TestClass',
			// @ts-expect-error
			object: {},
			operationType: OperationType.BeforeRead,
		})

		const context: Context = {
			sessionId: '',
			// @ts-expect-error
			user: {},
		}

		expect(_checkPermissions(obj, context)).rejects.toThrow(
			'Permission denied to read class TestClass',
		)
	})

	it('should not throw permission denied if valid session id is provided', async () => {
		mockGetObject.mockResolvedValue({
			id: 'sessionId',
			user: { id: 'userId' },
		} as never)

		const obj = new HookObject({
			// @ts-expect-error
			className: 'TestClass',
			// @ts-expect-error
			object: {},
			operationType: OperationType.BeforeRead,
		})

		const context: Context = {
			sessionId: 'sessionId',
			user: {
				id: 'userId',
			},
		}

		expect(_checkPermissions(obj, context)).resolves
	})
})
