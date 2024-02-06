import { EventEmitter } from 'events'

export class WibeEmitter {
    private emitter: EventEmitter

    constructor() {
        this.emitter = new EventEmitter()
    }

    emit(event: string, ...args: any[]) {
        this.emitter.emit(event, ...args)
    }

    on(event: string, listener: (...args: any[]) => void) {
        this.emitter.on(event, listener)
    }

    once(event: string, listener: (...args: any[]) => void) {
        this.emitter.once(event, listener)
    }
}

/*

// Declaration :

// action : 'beforeInsert' | 'afterInsert' | 'beforeUpdate' | 'afterUpdate' | 'beforeDelete' | 'afterDelete'

hooks = [
  {
    action: 'beforeInsert'
    listener: (object: _User | Post) => void
  }
]

// DatabaseController :

createObject() {
  WibeApp.eventEmitter.emit('beforeInsert', object)

  // here we create the object

  WibeApp.eventEmitter.emit('afterInsert', object)
}

// Hook system :

- Read all the hook for each hook create an on listener
- When the event is emitted, call the listener

*/
