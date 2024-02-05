import { EventEmitter } from 'events'

export class WibeEmitter {
    private emitter: EventEmitter
    constructor() {
        this.emitter = new EventEmitter()
    }

    emit(event: string) {
        this.emitter.emit(event)
    }

    on(event: string, listener: (...args: any[]) => void) {
        this.emitter.on(event, listener)
    }
}
