import { describe, expect, it, beforeEach, mock, spyOn } from 'bun:test'
import { _getPermissionPropertiesOfAClass, _checkCLP } from './permissions'
import { HookObject } from './HookObject'
import { OperationType } from '.'
import type { WabeContext } from '../server/interface'
import * as permissions from './permissions'
import { RoleEnum } from '../../generated/wabe'

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
                authorizedRoles: [RoleEnum.Admin],
              },
            },
          },
          {
            name: 'TestClass2',
            fields: {
              field2: { type: 'String' },
            },
          },
          {
            name: 'TestClass3',
            fields: {
              field2: { type: 'String' },
            },
            permissions: {
              read: {
                requireAuthentication: true,
                authorizedRoles: ['everyone'],
              },
            },
          },
          {
            name: 'TestClass4',
            fields: {
              field2: { type: 'String' },
            },
            permissions: {
              read: {
                requireAuthentication: true,
                authorizedRoles: [],
              },
            },
          },
          {
            name: 'TestClass5',
            fields: {
              field2: { type: 'String' },
            },
            permissions: {},
          },
        ],
      },
    } as any

    const context = { wabe: { config } } as any

    it('should throw an error if authorized roles is empty and the user is not root', () => {
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
          },
        },
        isRoot: false,
        wabe: { controllers, config } as any,
      }

      const obj = new HookObject({
        className: 'TestClass4',
        context,
        object: {
          id: 'id',
        },
        operationType: OperationType.BeforeRead,
        fields: [],
      })

      expect(_checkCLP(obj, OperationType.BeforeRead)).rejects.toThrow(
        'Permission denied to read class TestClass4',
      )
    })

    it('should throw an error if operation is undefined and user is not root', () => {
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
          },
        },
        isRoot: false,
        wabe: { controllers, config } as any,
      }

      const obj = new HookObject({
        className: 'TestClass5',
        context,
        object: {
          id: 'id',
        },
        operationType: OperationType.BeforeRead,
        fields: [],
      })

      expect(_checkCLP(obj, OperationType.BeforeRead)).rejects.toThrow(
        'Permission denied to read class TestClass5',
      )
    })

    it('should get the permission for a given className', async () => {
      const permission = await _getPermissionPropertiesOfAClass({
        className: 'TestClass',
        operation: 'read',
        context,
      })

      expect(permission).toEqual({
        requireAuthentication: true,
        authorizedRoles: [RoleEnum.Admin],
      })

      const permission2 = await _getPermissionPropertiesOfAClass({
        className: 'TestClass2',
        operation: 'read',
        context,
      })

      expect(permission2).toBeUndefined()
    })

    it('should throw permission denied if no session id is provided but class require authentication', () => {
      const context: WabeContext<any> = {
        sessionId: '',
        // @ts-expect-error
        user: {},
        isRoot: false,
        wabe: { controllers, config } as any,
      }

      const obj = new HookObject({
        className: 'TestClass',
        context,
        object: {
          id: 'id',
        },
        operationType: OperationType.BeforeRead,
        fields: [],
      })

      expect(_checkCLP(obj, OperationType.BeforeRead)).rejects.toThrow(
        'Permission denied to read class TestClass',
      )
    })

    it('should not throw permission denied if authorized roles is everyone', () => {
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
        wabe: {
          controllers,
          config,
        } as any,
      }

      const obj = new HookObject({
        className: 'TestClass3',
        context,
        object: {
          id: 'id',
        },
        operationType: OperationType.BeforeRead,
        fields: [],
      })

      expect(_checkCLP(obj, OperationType.BeforeRead)).resolves
    })

    it('should throw permission denied if authorized roles is everyone but requireAuthentication is true and client is anonymous', () => {
      mockGetObject.mockResolvedValue({
        id: 'sessionId',
        user: { id: 'userId' },
      } as never)

      const context: WabeContext<any> = {
        sessionId: undefined,
        user: undefined,
        isRoot: false,
        wabe: {
          controllers,
          config,
        } as any,
      }

      const obj = new HookObject({
        className: 'TestClass3',
        context,
        object: {
          id: 'id',
        },
        operationType: OperationType.BeforeRead,
        fields: [],
      })

      expect(_checkCLP(obj, OperationType.BeforeRead)).rejects.toThrow(
        'Permission denied to read class TestClass3',
      )
    })

    it('should throw permission denied if role is not an authorized role', () => {
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
        wabe: {
          controllers,
          config,
        } as any,
      }

      const obj = new HookObject({
        className: 'TestClass',
        context,
        object: {
          id: 'id',
        },
        operationType: OperationType.BeforeRead,
        fields: [],
      })

      expect(_checkCLP(obj, OperationType.BeforeRead)).rejects.toThrow(
        'Permission denied to read class TestClass',
      )
    })

    it('should not throw permission denied if valid session id is provided', () => {
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
        wabe: {
          controllers,
          config,
        } as any,
      }

      const obj = new HookObject({
        className: 'TestClass',
        context,
        object: { id: 'id' },
        operationType: OperationType.BeforeRead,
        fields: [],
      })

      expect(_checkCLP(obj, OperationType.BeforeRead)).resolves
    })

    it('should not throw permission denied if client is root', () => {
      const context: WabeContext<any> = {
        sessionId: '',
        user: {
          id: '',
        } as any,
        isRoot: true,
        wabe: { controllers, config } as any,
      }

      const obj = new HookObject({
        className: 'TestClass',
        context,
        object: { id: 'id' },
        operationType: OperationType.BeforeRead,
        fields: [],
      })

      expect(_checkCLP(obj, OperationType.BeforeRead)).resolves
    })

    it('should call _checkPermission on beforeRead', () => {
      const spyBeforeRead = spyOn(
        permissions,
        'defaultCheckPermissionOnRead',
      ).mockResolvedValue()

      permissions.defaultCheckPermissionOnRead({} as never)

      expect(spyBeforeRead).toHaveBeenCalledTimes(1)
      expect(spyBeforeRead).toHaveBeenCalledWith({})

      spyBeforeRead.mockRestore()
    })

    it('should call _checkPermission on beforeCreate', () => {
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

    it('should call _checkPermission on beforeUpdate', () => {
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

    it('should call _checkPermission on beforeDelete', () => {
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
