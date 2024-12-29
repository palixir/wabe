import type { OperationType } from '.'
import type { MutationData, OutputType } from '../database'
import type { WabeTypes } from '../server'
import type { WabeContext } from '../server/interface'

export class HookObject<
  T extends WabeTypes,
  K extends keyof WabeTypes['types'],
> {
  public className: K
  private newData: MutationData<T, K, keyof T['types'][K]> | undefined
  private operationType: OperationType
  public context: WabeContext<T>
  public object: OutputType<T, K, any>

  constructor({
    newData,
    className,
    operationType,
    context,
    object,
  }: {
    className: K
    newData?: MutationData<T, K, keyof T['types'][K]>
    operationType: OperationType
    context: WabeContext<T>
    object: OutputType<T, K, any>
  }) {
    this.newData = newData
    this.className = className
    this.operationType = operationType
    this.context = context
    this.object = object
  }

  getUser() {
    return this.context.user
  }

  isFieldUpdated(field: keyof T['types'][K]) {
    return this.newData && !!this.newData[field]
  }

  upsertNewData(field: keyof T['types'][K], value: any) {
    if (!this.newData) return

    if (!this.operationType.includes('before'))
      throw new Error('Cannot set data in a hook that is not a before hook')

    this.newData[field] = value
  }

  getNewData(): MutationData<T, K, keyof T['types'][K]> {
    return this.newData || ({} as any)
  }

  fetch(): Promise<OutputType<T, K, any>> {
    const databaseController = this.context.wabe.controllers.database

    if (!this.object?.id) return Promise.resolve(null)

    return databaseController.getObject({
      className: this.className,
      id: this.object.id,
      context: {
        ...this.context,
        isRoot: true,
      },
      fields: ['*'],
    })
  }
}
