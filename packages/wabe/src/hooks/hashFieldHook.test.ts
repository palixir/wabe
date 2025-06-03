import { hashFieldHook } from './hashFieldHook'
import { describe, expect, it } from 'bun:test'
import { Algorithm, verify, hash as argon2hash } from '@node-rs/argon2'
import { HookObject } from './HookObject'

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
  const fields = {
    password: { type: 'Hash' },
    email: { type: 'Email' },
  }

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
    // Verify the hash
    const isValid = await verify(hookObject.getNewData().password, 'mysecret')
    expect(isValid).toBe(true)
  })

  it('does not double-hash an already hashed value', async () => {
    const hashed = await argon2hash('alreadyhashed', {
      algorithm: Algorithm.Argon2id,
    })
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
