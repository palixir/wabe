import { describe, expect, it, beforeEach, mock, spyOn } from 'bun:test'
import { _getPermissionPropertiesOfAClass, _checkCLP } from './permissions'
import { HookObject } from './HookObject'
import { OperationType } from '.'
import type { WabeContext } from '../server/interface'
import * as permissions from './permissions'

describe('Permissions', () => {
	describe('Class Level Permissions', () => {
		const mockGetObject = mock(() => {})

		const controllers = {
			database: {
				getObject: mockGetObject,
			},
		} as any

		beforeEach(() => {
			mockGetObject.mockClear()
		})

		const config = {
			schema: {
				classes: [
					{
						name: 'TestClass',
						fields: {
							field1: { type: 'String' },
						},
						permissions: {
							read: {
								requireAuthentication: true,
								authorizedRoles: ['Admin'],
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
		} as any

		const context = { wabeApp: { config } } as any

		it('should get the permission for a given className', async () => {
			const permission = await _getPermissionPropertiesOfAClass({
				className: 'TestClass',
				operation: 'read',
				context,
			})

			expect(permission).toEqual({
				requireAuthentication: true,
				authorizedRoles: ['Admin'],
			})

			const permission2 = await _getPermissionPropertiesOfAClass({
				className: 'TestClass2',
				operation: 'read',
				context,
			})

			expect(permission2).toBeUndefined()
		})

		it('should throw permission denied if no session id is provided but class require authentication', async () => {
			const context: WabeContext<any> = {
				sessionId: '',
				// @ts-expect-error
				user: {},
				isRoot: false,
				wabeApp: { controllers, config } as any,
			}

			const obj = new HookObject({
				className: 'TestClass',
				context,
				object: {},
				operationType: OperationType.BeforeRead,
			})

			expect(_checkCLP(obj, OperationType.BeforeRead)).rejects.toThrow(
				'Permission denied to read class TestClass',
			)
		})

		it('should throw permission denied if role is not an authorized role', async () => {
			mockGetObject.mockResolvedValue({
				id: 'sessionId',
				user: { id: 'userId' },
			} as never)

			const context: WabeContext<any> = {
				sessionId: 'sessionId',
				user: {
					id: 'userId',
					role: {
						id: 'roleId',
						name: 'Role',
					} as any,
				} as any,
				isRoot: false,
				wabeApp: {
					controllers,
					config,
				} as any,
			}

			const obj = new HookObject({
				className: 'TestClass',
				context,
				object: {},
				operationType: OperationType.BeforeRead,
			})

			expect(_checkCLP(obj, OperationType.BeforeRead)).rejects.toThrow(
				'Permission denied to read class TestClass',
			)
		})

		it('should not throw permission denied if valid session id is provided', async () => {
			mockGetObject.mockResolvedValue({
				id: 'sessionId',
				user: { id: 'userId' },
			} as never)

			const context: WabeContext<any> = {
				sessionId: 'sessionId',
				user: {
					id: 'userId',
					role: {
						id: 'roleId',
						name: 'Admin',
					} as any,
				} as any,
				isRoot: false,
				wabeApp: {
					controllers,
					config,
				} as any,
			}

			const obj = new HookObject({
				className: 'TestClass',
				context,
				object: {},
				operationType: OperationType.BeforeRead,
			})

			expect(_checkCLP(obj, OperationType.BeforeRead)).resolves
		})

		it('should not throw permission denied if client is root', async () => {
			const context: WabeContext<any> = {
				sessionId: '',
				user: {
					id: '',
				} as any,
				isRoot: true,
				wabeApp: { controllers, config } as any,
			}

			const obj = new HookObject({
				className: 'TestClass',
				context,
				object: {},
				operationType: OperationType.BeforeRead,
			})

			expect(_checkCLP(obj, OperationType.BeforeRead)).resolves
		})

		it('should call _checkPermission on beforeRead', async () => {
			const spyBeforeRead = spyOn(
				permissions,
				'defaultCheckPermissionOnRead',
			).mockResolvedValue()

			permissions.defaultCheckPermissionOnRead({} as never)

			expect(spyBeforeRead).toHaveBeenCalledTimes(1)
			expect(spyBeforeRead).toHaveBeenCalledWith({})

			spyBeforeRead.mockRestore()
		})

		it('should call _checkPermission on beforeCreate', async () => {
			const spyBeforeCreate = spyOn(
				permissions,
				'defaultCheckPermissionOnCreate',
			).mockResolvedValue()

			permissions.defaultCheckPermissionOnCreate({
				sessionId: 'sessionId',
				user: { id: 'userId' },
			} as never)

			expect(spyBeforeCreate).toHaveBeenCalledTimes(1)
			expect(spyBeforeCreate).toHaveBeenCalledWith({
				sessionId: 'sessionId',
				user: { id: 'userId' },
			})

			spyBeforeCreate.mockRestore()
		})

		it('should call _checkPermission on beforeUpdate', async () => {
			const spyBeforeUpdate = spyOn(
				permissions,
				'defaultCheckPermissionOnUpdate',
			).mockResolvedValue()

			permissions.defaultCheckPermissionOnUpdate({
				sessionId: 'sessionId',
				user: { id: 'userId' },
			} as never)

			expect(spyBeforeUpdate).toHaveBeenCalledTimes(1)
			expect(spyBeforeUpdate).toHaveBeenCalledWith({
				sessionId: 'sessionId',
				user: { id: 'userId' },
			})

			spyBeforeUpdate.mockRestore()
		})

		it('should call _checkPermission on beforeDelete', async () => {
			const spyBeforeDelete = spyOn(
				permissions,
				'defaultCheckPermissionOnDelete',
			).mockResolvedValue()

			permissions.defaultCheckPermissionOnDelete({
				sessionId: 'sessionId',
				user: { id: 'userId' },
			} as never)

			expect(spyBeforeDelete).toHaveBeenCalledTimes(1)
			expect(spyBeforeDelete).toHaveBeenCalledWith({
				sessionId: 'sessionId',
				user: { id: 'userId' },
			})

			spyBeforeDelete.mockRestore()
		})
	})
})
