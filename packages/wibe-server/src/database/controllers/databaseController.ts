import { WibeSchemaTypes } from '../../../generated/wibe'
import {
  HookAfterDelete,
  HookAfterInsert,
  HookAfterUpdate,
  HookBeforeDelete,
  HookBeforeInsert,
  HookBeforeUpdate,
  HookTrigger,
} from '../../hooks'
import { HookObject } from '../../hooks/HookObject'
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
    const hookObject = new HookObject({
      className: params.className,
      data: params.data,
    })

    const hooksToCompute = WibeApp.config.hooks?.filter(
      (hook) => hook.trigger === HookTrigger.BeforeInsert,
    ) || []

    await Promise.all(hooksToCompute.map((hook) => hook.callback(hookObject)))

    const insertedObject = await this.adapter.createObject(params)

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
    const updatedObject = await this.adapter.updateObject(params)

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
    const deletedObject = await this.adapter.deleteObject(params)

    return deletedObject
  }

  async deleteObjects<
    T extends keyof WibeSchemaTypes,
    K extends keyof WibeSchemaTypes[T],
  >(params: DeleteObjectsOptions<T, K>) {
    return this.adapter.deleteObjects(params)
  }
}
