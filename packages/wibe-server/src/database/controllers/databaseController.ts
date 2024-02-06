import { WibeSchemaTypes } from '../../../generated/wibe'
import {
    HookAfterDelete,
    HookAfterInsert,
    HookAfterUpdate,
    HookBeforeDelete,
    HookBeforeInsert,
    HookBeforeUpdate,
} from '../../hooks'
import { WibeApp } from '../../server'
import {
    CreateObjectOptions,
    CreateObjectsOptions,
    DatabaseAdapter,
    DeleteObjectOptions,
    DeleteObjectsOptions,
    GetObjectOptions,
    GetObjectsOptions,
    UpdateObjectOptions,
    UpdateObjectsOptions,
} from '../adapters/adaptersInterface'

export class DatabaseController {
    public adapter: DatabaseAdapter

    constructor(adapter: DatabaseAdapter) {
        this.adapter = adapter
    }

    async connect() {
        return this.adapter.connect()
    }

    async close() {
        return this.adapter.close()
    }

    async createClass(className: string) {
        return this.adapter.createClass(className)
    }

    async getObject<
        T extends keyof WibeSchemaTypes,
        K extends keyof WibeSchemaTypes[T],
    >(params: GetObjectOptions<T, K>) {
        return this.adapter.getObject(params)
    }

    async getObjects<
        T extends keyof WibeSchemaTypes,
        K extends keyof WibeSchemaTypes[T],
    >(params: GetObjectsOptions<T, K>) {
        return this.adapter.getObjects(params)
    }

    async createObject<
        T extends keyof WibeSchemaTypes,
        K extends keyof WibeSchemaTypes[T],
    >(params: CreateObjectOptions<T, K>) {
        WibeApp.eventEmitter.emit(
            'beforeInsert',
            params as HookBeforeInsert<T, K>,
        )
        const insertedObject = await this.adapter.createObject(params)
        WibeApp.eventEmitter.emit('afterInsert', {
            ...params,
            insertedObject,
        } as HookAfterInsert<T, K>)

        return insertedObject
    }

    async createObjects<
        T extends keyof WibeSchemaTypes,
        K extends keyof WibeSchemaTypes[T],
    >(params: CreateObjectsOptions<T, K>) {
        return this.adapter.createObjects(params)
    }

    async updateObject<
        T extends keyof WibeSchemaTypes,
        K extends keyof WibeSchemaTypes[T],
    >(params: UpdateObjectOptions<T, K>) {
        WibeApp.eventEmitter.emit(
            'beforeUpdate',
            params as HookBeforeUpdate<T, K>,
        )
        const updatedObject = await this.adapter.updateObject(params)
        WibeApp.eventEmitter.emit('afterUpdate', {
            ...params,
            updatedObject,
        } as HookAfterUpdate<T, K>)

        return updatedObject
    }

    async updateObjects<
        T extends keyof WibeSchemaTypes,
        K extends keyof WibeSchemaTypes[T],
    >(params: UpdateObjectsOptions<T, K>) {
        return this.adapter.updateObjects(params)
    }

    async deleteObject<
        T extends keyof WibeSchemaTypes,
        K extends keyof WibeSchemaTypes[T],
    >(params: DeleteObjectOptions<T, K>) {
        WibeApp.eventEmitter.emit(
            'beforeDelete',
            params as HookBeforeDelete<T, K>,
        )
        const deletedObject = await this.adapter.deleteObject(params)
        WibeApp.eventEmitter.emit('afterDelete', {
            ...params,
            deletedObject,
        } as HookAfterDelete<T, K>)

        return deletedObject
    }

    async deleteObjects<
        T extends keyof WibeSchemaTypes,
        K extends keyof WibeSchemaTypes[T],
    >(params: DeleteObjectsOptions<T, K>) {
        return this.adapter.deleteObjects(params)
    }
}
