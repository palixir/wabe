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

    async getObject<T extends WibeSchemaTypes>(params: GetObjectOptions<T>) {
        return this.adapter.getObject(params)
    }

    async getObjects<T extends WibeSchemaTypes>(params: GetObjectsOptions<T>) {
        return this.adapter.getObjects(params)
    }

    async createObject<T extends WibeSchemaTypes>(
        params: CreateObjectOptions<T>,
    ) {
        return this.adapter.createObject(params)
    }

    async createObjects<T extends WibeSchemaTypes>(
        params: CreateObjectsOptions<T>,
    ) {
        return this.adapter.createObjects(params)
    }

    async updateObject<T extends WibeSchemaTypes>(
        params: UpdateObjectOptions<T>,
    ) {
        return this.adapter.updateObject(params)
    }

    async updateObjects<T extends WibeSchemaTypes>(
        params: UpdateObjectsOptions<T>,
    ) {
        return this.adapter.updateObjects(params)
    }

    async deleteObject<T extends WibeSchemaTypes>(
        params: DeleteObjectOptions<T>,
    ) {
        return this.adapter.deleteObject(params)
    }

    async deleteObjects<T extends WibeSchemaTypes>(
        params: DeleteObjectsOptions<T>,
    ) {
        return this.adapter.deleteObjects(params)
    }
}
