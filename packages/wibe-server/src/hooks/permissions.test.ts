import { describe, expect, it, beforeEach, mock, spyOn } from 'bun:test'
import { _getPermissionPropertiesOfAClass, _checkCLP } from './permissions'
import { HookObject } from './HookObject'
import { OperationType } from '.'
import type { Context } from '../server/interface'
import * as permissions from './permissions'

describe('Permissions', () => {
	describe('ACL', () => {
		it("should throw an error on read if the user don't have access", async () => {
			const hookObject = {
				className: 'className',
				context: {
					user: {
						id: 'userId',
						role: {
							id: 'anotherRoleId',
						},
					},
				},
				object: {
					acl: {
						roles: [{ roleId: 'roleId', read: true, write: true }],
						users: [{ userId: 'userId', read: false, write: true }],
					},
				},
			} as any

			expect(
				permissions._checkACL(hookObject, OperationType.BeforeRead),
			).rejects.toThrow('Permission denied to read class className')
		})

		it("should throw an error on write if the user don't have access", async () => {
			const hookObject = {
				className: 'className',
				context: {
					user: {
						id: 'userId',
						role: {
							id: 'anotherRoleId',
						},
					},
				},
				object: {
					acl: {
						roles: [{ roleId: 'roleId', read: true, write: true }],
						users: [
							{ userId: 'userId', read: false, write: false },
						],
					},
				},
			} as any

			expect(
				permissions._checkACL(hookObject, OperationType.BeforeCreate),
			).rejects.toThrow('Permission denied to write class className')
		})

		it("should throw an error on read if the role don't have access", async () => {
			const hookObject = {
				className: 'className',
				context: {
					user: {
						id: 'anotherUserId',
						role: {
							id: 'roleId',
						},
					},
				},
				object: {
					acl: {
						roles: [{ roleId: 'roleId', read: false, write: true }],
						users: [
							{ userId: 'userId', read: false, write: false },
						],
					},
				},
			} as any

			expect(
				permissions._checkACL(hookObject, OperationType.BeforeRead),
			).rejects.toThrow('Permission denied to read class className')
		})

		it("should throw an error on write if the role don't have access", async () => {
			const hookObject = {
				className: 'className',
				context: {
					user: {
						id: 'anotherUserId',
						role: {
							id: 'roleId',
						},
					},
				},
				object: {
					acl: {
						roles: [
							{ roleId: 'roleId', read: false, write: false },
						],
						users: [
							{ userId: 'userId', read: false, write: false },
						],
					},
				},
			} as any

			expect(
				permissions._checkACL(hookObject, OperationType.BeforeRead),
			).rejects.toThrow('Permission denied to read class className')
		})

		it('should throw an error on read if the userId and roleId are not found in ACL', async () => {
			const hookObject = {
				className: 'className',
				context: {
					user: {
						id: 'anotherUserId',
						role: {
							id: 'anotherRoleId',
						},
					},
				},
				object: {
					acl: {
						roles: [
							{ roleId: 'roleId', read: false, write: false },
						],
						users: [
							{ userId: 'userId', read: false, write: false },
						],
					},
				},
			} as any

			expect(
				permissions._checkACL(hookObject, OperationType.BeforeRead),
			).rejects.toThrow('Permission denied to read class className')
		})

		it('should authorize the access to an user that have access to read', async () => {
			const hookObject = {
				className: 'className',
				context: {
					user: {
						id: 'userId',
						role: {
							id: 'anotherRoleId',
						},
					},
				},
				object: {
					acl: {
						roles: [
							{ roleId: 'roleId', read: false, write: false },
						],
						users: [{ userId: 'userId', read: true, write: false }],
					},
				},
			} as any

			expect(permissions._checkACL(hookObject, OperationType.BeforeRead))
				.resolves
		})

		it('should authorize the access to a role that have access to read', async () => {
			const hookObject = {
				className: 'className',
				context: {
					user: {
						id: 'anotherUserId',
						role: {
							id: 'roleId',
						},
					},
				},
				object: {
					acl: {
						roles: [{ roleId: 'roleId', read: true, write: false }],
						users: [
							{ userId: 'userId', read: false, write: false },
						],
					},
				},
			} as any

			expect(permissions._checkACL(hookObject, OperationType.BeforeRead))
				.resolves
		})

		it('should authorize the access to an user that have access to write', async () => {
			const hookObject = {
				className: 'className',
				context: {
					user: {
						id: 'userId',
						role: {
							id: 'anotherRoleId',
						},
					},
				},
				object: {
					acl: {
						roles: [
							{ roleId: 'roleId', read: false, write: false },
						],
						users: [{ userId: 'userId', read: false, write: true }],
					},
				},
			} as any

			expect(
				permissions._checkACL(hookObject, OperationType.BeforeUpdate),
			).resolves
		})

		it('should authorize the access to a role that have access to write', async () => {
			const hookObject = {
				className: 'className',
				context: {
					user: {
						id: 'anotherUserId',
						role: {
							id: 'roleId',
						},
					},
				},
				object: {
					acl: {
						roles: [{ roleId: 'roleId', read: false, write: true }],
						users: [{ userId: 'userId', read: true, write: true }],
					},
				},
			} as any

			expect(
				permissions._checkACL(hookObject, OperationType.BeforeUpdate),
			).resolves
		})
	})

	describe('Class Level Permissions', () => {
		const mockGetObject = mock(() => {})

		const databaseController = {
			getObject: mockGetObject,
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

		it('should get the permission for a given className', async () => {
			const permission = await _getPermissionPropertiesOfAClass({
				className: 'TestClass',
				operation: 'read',
				context: { config } as any,
			})

			expect(permission).toEqual({
				requireAuthentication: true,
				authorizedRoles: ['Admin'],
			})

			const permission2 = await _getPermissionPropertiesOfAClass({
				className: 'TestClass2',
				operation: 'read',
				context: { config } as any,
			})

			expect(permission2).toBeUndefined()
		})

		it('should throw permission denied if no session id is provided but class require authentication', async () => {
			const context: Context<any> = {
				sessionId: '',
				// @ts-expect-error
				user: {},
				isRoot: false,
				databaseController,
				config,
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

			const context: Context<any> = {
				sessionId: 'sessionId',
				user: {
					id: 'userId',
					role: {
						id: 'roleId',
						name: 'Role',
					} as any,
				} as any,
				isRoot: false,
				databaseController,
				config,
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

			const context: Context<any> = {
				sessionId: 'sessionId',
				user: {
					id: 'userId',
					role: {
						id: 'roleId',
						name: 'Admin',
					} as any,
				} as any,
				databaseController,
				isRoot: false,
				config,
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
			const context: Context<any> = {
				sessionId: '',
				user: {
					id: '',
				} as any,
				databaseController,
				isRoot: true,
				config,
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
