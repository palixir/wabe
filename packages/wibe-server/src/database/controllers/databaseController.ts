import { WibeSchemaTypes } from '../../../generated/wibe'
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
    >(params: GetObjectOptions<T>) {
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
        return this.adapter.createObject(params)
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
        return this.adapter.updateObject(params)
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
        return this.adapter.deleteObject(params)
    }

    async deleteObjects<
        T extends keyof WibeSchemaTypes,
        K extends keyof WibeSchemaTypes[T],
    >(params: DeleteObjectsOptions<T, K>) {
        return this.adapter.deleteObjects(params)
    }
}
