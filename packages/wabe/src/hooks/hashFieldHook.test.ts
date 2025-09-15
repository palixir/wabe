import { hashFieldHook } from './hashFieldHook'
import { describe, expect, it } from 'bun:test'
import { HookObject } from './HookObject'
import type { SchemaFields } from '../schema'
import { OperationType } from '.'
import { hashArgon2, verifyArgon2 } from 'src/utils/crypto'

const makeHookObject = ({ className, operationType, newData, fields }: any) => {
  const config = {
    port: 0,
    isProduction: false,
    database: {} as any,
    rootKey: '',
    schema: {
      classes: [{ name: className, fields }],
    },
  }
  return new HookObject({
    className,
    operationType,
    newData,
    context: {
      wabe: { config } as any,
      isRoot: false,
    },
    object: { id: 'dummy' },
    select: {},
  })
}

describe('hashFieldHook', () => {
  const fields: SchemaFields<any> = {
    password: { type: 'Hash' },
    email: { type: 'Email' },
    authentication: {
      type: 'Object',
      object: {
        name: 'Authentication',
        fields: {
          emailPassword: {
            type: 'Object',
            object: {
              name: 'EmailPassword',
              fields: {
                password: { type: 'Hash' },
              },
            },
          },
        },
      },
    },
    twoHashes: {
      type: 'Object',
      object: {
        name: 'TwoHashes',
        fields: {
          hash1: { type: 'Hash' },
          hash2: { type: 'Hash' },
        },
      },
    },
  }

  it('should hashed a plain value in a sub object in beforeCreate', async () => {
    const newData = {
      authentication: { emailPassword: { password: 'mysecret' } },
    }

    const hookObject = makeHookObject({
      className: 'User',
      operationType: OperationType.BeforeCreate,
      newData,
      fields,
    })

    await hashFieldHook(hookObject)

    expect(
      hookObject.getNewData().authentication.emailPassword.password,
    ).not.toBe('mysecret')

    const isValid = await verifyArgon2(
      'mysecret',
      hookObject.getNewData().authentication.emailPassword.password,
    )
    expect(isValid).toBe(true)
  })

  it('should hashed a plain value in a sub object with 2 hash fields in beforeCreate', async () => {
    const newData = {
      twoHashes: { hash1: 'mysecret', hash2: 'mysecret' },
    }

    const hookObject = makeHookObject({
      className: 'User',
      operationType: OperationType.BeforeCreate,
      newData,
      fields,
    })

    await hashFieldHook(hookObject)

    expect(hookObject.getNewData().twoHashes.hash1).not.toBe('mysecret')

    const isValid = await verifyArgon2(
      'mysecret',
      hookObject.getNewData().twoHashes.hash1,
    )
    expect(isValid).toBe(true)

    expect(hookObject.getNewData().twoHashes.hash2).not.toBe('mysecret')

    const isValid2 = await verifyArgon2(
      'mysecret',
      hookObject.getNewData().twoHashes.hash2,
    )
    expect(isValid2).toBe(true)
  })

  it('hashes a plain value on beforeCreate', async () => {
    const newData = { password: 'mysecret', email: 'test@example.com' }
    const hookObject = makeHookObject({
      className: 'User',
      operationType: 'beforeCreate',
      newData,
      fields,
    })
    await hashFieldHook(hookObject)
    expect(hookObject.getNewData().password).not.toBe('mysecret')
    expect(hookObject.getNewData().email).toBe('test@example.com')

    const isValid = await verifyArgon2(
      'mysecret',
      hookObject.getNewData().password,
    )
    expect(isValid).toBe(true)
  })

  it('does not double-hash an already hashed value', async () => {
    const hashed = await hashArgon2('alreadyhashed')
    const newData = { password: hashed }
    const hookObject = makeHookObject({
      className: 'User',
      operationType: 'beforeUpdate',
      newData,
      fields,
    })
    await hashFieldHook(hookObject)
    expect(hookObject.getNewData().password).toBe(hashed)
  })

  it('does nothing if not beforeCreate or beforeUpdate', async () => {
    const newData = { password: 'shouldnotchange' }
    const hookObject = makeHookObject({
      className: 'User',
      operationType: 'afterRead',
      newData,
      fields,
    })
    await hashFieldHook(hookObject)
    expect(hookObject.getNewData().password).toBe('shouldnotchange')
  })
})
