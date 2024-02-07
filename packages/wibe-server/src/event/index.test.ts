import { describe, expect, it, spyOn, mock, beforeEach } from 'bun:test'
import { EventEmitter } from 'events'
import { WibeEmitter } from './index'

describe('Event', () => {
    const emitter = new WibeEmitter()

    const spyEmitEventEmitter = spyOn(EventEmitter.prototype, 'emit')
    const spyOnEventEmitter = spyOn(EventEmitter.prototype, 'on')
    const spyOnceEventEmitter = spyOn(EventEmitter.prototype, 'once')

    beforeEach(() => {
        spyEmitEventEmitter.mockClear()
        spyOnEventEmitter.mockClear()
    })

    it('should emit an event', () => {
        emitter.emit('event', { data: 'data' })

        expect(spyEmitEventEmitter).toHaveBeenCalledTimes(1)
        expect(spyEmitEventEmitter).toHaveBeenCalledWith('event', {
            data: 'data',
        })
    })

    it('should receive an event', () => {
        const mockCallback = mock(() => {})
        emitter.on('event', mockCallback)

        emitter.emit('event', { data: 'data' })

        expect(spyOnEventEmitter).toHaveBeenCalledTimes(1)
        expect(spyOnEventEmitter).toHaveBeenCalledWith('event', mockCallback)

        expect(mockCallback).toHaveBeenCalledTimes(1)
        expect(mockCallback).toHaveBeenCalledWith({ data: 'data' })
    })

    it('should receive once an event', () => {
        const mockCallback = mock(() => {})
        emitter.once('event', mockCallback)

        emitter.emit('event', { data: 'data' })
        emitter.emit('event', { data: 'data' })

        expect(spyOnceEventEmitter).toHaveBeenCalledTimes(1)
        expect(spyOnceEventEmitter).toHaveBeenCalledWith('event', mockCallback)

        expect(mockCallback).toHaveBeenCalledTimes(1)
        expect(mockCallback).toHaveBeenCalledWith({ data: 'data' })
    })
})
