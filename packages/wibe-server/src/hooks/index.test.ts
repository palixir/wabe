import { describe, expect, it, spyOn, mock } from 'bun:test'
import { computeHooks, HookTrigger } from './index'
import { WibeEmitter } from '../event'
import { WibeApp } from '..'

describe('Hooks', () => {
    it('should load two hooks', () => {
        const wibeEmitter = new WibeEmitter()
        WibeApp.eventEmitter = wibeEmitter

        const spyOnWibeEmitter = spyOn(WibeEmitter.prototype, 'on')

        const mockCallbackBeforeInsert = mock(() => {})
        const mockCallbackAfterDelete = mock(() => {})

        computeHooks([
            {
                trigger: HookTrigger.BeforeInsert,
                callback: mockCallbackBeforeInsert,
            },
            {
                trigger: HookTrigger.AfterDelete,
                callback: mockCallbackAfterDelete,
            },
        ])

        wibeEmitter.emit(HookTrigger.BeforeInsert, { data: { tata: 'tutu' } })
        wibeEmitter.emit(HookTrigger.AfterDelete, { data: { titi: 'toto' } })

        expect(mockCallbackBeforeInsert).toHaveBeenCalledTimes(1)
        expect(mockCallbackAfterDelete).toHaveBeenCalledTimes(1)
        expect(mockCallbackBeforeInsert).toHaveBeenCalledWith({
            data: { tata: 'tutu' },
        })
        expect(mockCallbackAfterDelete).toHaveBeenCalledWith({
            data: { titi: 'toto' },
        })

        expect(spyOnWibeEmitter).toHaveBeenCalledTimes(2)

        spyOnWibeEmitter.mockRestore()
    })
})
