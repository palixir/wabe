import { describe, expect, it } from 'bun:test'
import { HookObject } from './HookObject'
import { _User } from '../../generated/wibe'

describe('HookObject', () => {
    it('should get data correctly', () => {
        const userData = { name: 'John Doe', age: 30 }

        const hookObject = new HookObject({
            className: '_User',
            data: userData,
        })

        expect(hookObject.className).toEqual('_User')

        expect(hookObject.get({ field: 'name' })).toEqual('John Doe')
        expect(hookObject.get({ field: 'age' })).toEqual(30)
    })

    it('should set data correctly', () => {
        const userData = { name: 'John Doe', age: 30 }

        const hookObject = new HookObject({
            className: '_User',
            data: userData,
        })

        hookObject.set({ field: 'name', value: 'tata' })

        expect(hookObject.get({ field: 'name' })).toEqual('tata')
        expect(hookObject.get({ field: 'age' })).toEqual(30)
    })
})
