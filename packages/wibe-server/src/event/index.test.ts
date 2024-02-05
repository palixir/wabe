import { describe, expect, it } from 'bun:test'
import { WibeEmitter } from './index'

describe('Event', () => {
    it('should emit an event', () => {
        const emitter = new WibeEmitter()

        emitter.on('test', () => {
            console.log('Event emitted')
        })

        emitter.emit('tata')
    })
})
