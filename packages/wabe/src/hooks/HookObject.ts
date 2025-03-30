import type { OperationType } from '.'
import type { RoleEnum, ACLObject } from '../../generated/wabe'
import type { MutationData, OutputType, Select } from '../database'
import type { WabeTypes } from '../server'
import type { WabeContext } from '../server/interface'
import { contextWithRoot } from '../utils/export'

type AddACLOpptions = {
  userId?: string
  role?: RoleEnum
  read: boolean
  write: boolean
} | null

export class HookObject<
  T extends WabeTypes,
  K extends keyof WabeTypes['types'],
> {
  public className: K
  private newData: MutationData<T, K, keyof T['types'][K]> | undefined
  private operationType: OperationType
  public context: WabeContext<T>
  public object: OutputType<T, K, keyof T['types'][K]>
  // Object before any mutation, for example before delete
  public originalObject: OutputType<T, K, keyof T['types'][K]> | undefined
  public select: Select

  constructor({
    newData,
    className,
    operationType,
    context,
    object,
    originalObject,
    select,
  }: {
    className: K
    newData?: MutationData<T, K, keyof T['types'][K]>
    operationType: OperationType
    context: WabeContext<T>
    object: OutputType<T, K, keyof T['types'][K]>
    originalObject?: OutputType<T, K, keyof T['types'][K]>
    select: Select
  }) {
    this.newData = newData
    this.className = className
    this.operationType = operationType
    this.context = context
    this.object = object
    this.originalObject = originalObject
    this.select = select || {}
  }

  getUser() {
    return this.context.user
  }

  isFieldUpdated(field: keyof T['types'][K]) {
    return !!(this.newData && !!this.newData[field])
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

  fetch(): Promise<OutputType<T, K, keyof T['types'][K]>> {
    const databaseController = this.context.wabe.controllers.database

    if (!this.object?.id) return Promise.resolve(null)

    return databaseController.getObject({
      className: this.className,
      id: this.object.id,
      context: contextWithRoot(this.context),
    })
  }

  async addACL(type: 'users' | 'roles', options: AddACLOpptions) {
    const updateACL = async (newACLObject: any) => {
      if (this.className === 'User') {
        const currentUserId = this.object?.id

        if (currentUserId)
          await this.context.wabe.controllers.database.updateObject({
            className: this.className,
            context: contextWithRoot(this.context),
            id: currentUserId,
            data: {
              // @ts-expect-error
              acl: newACLObject,
            },
            select: {},
          })

        return
      }

      // @ts-expect-error
      this.upsertNewData('acl', newACLObject)
    }

    const result =
      this.className === 'User'
        ? await this.context.wabe.controllers.database.getObject({
            className: 'User',
            // @ts-expect-error
            select: { acl: true },
            // @ts-expect-error
            id: this.object?.id,
            context: contextWithRoot(this.context),
          })
        : // @ts-expect-error
          { acl: this.getNewData().acl }

    const currentACL: ACLObject = result?.acl || {}

    if (options === null) {
      await updateACL({
        ...currentACL,
        [type]: [],
      })
      return
    }

    const { userId, role, read, write } = options

    if (userId && role) throw new Error('Cannot specify both userId and role')

    if (role) {
      const result = await this.context.wabe.controllers.database.getObjects({
        className: 'Role',
        // @ts-expect-error
        select: { id: true },
        // @ts-expect-error
        where: {
          name: {
            equalTo: role,
          },
        },
        context: contextWithRoot(this.context),
      })

      const roleId = result[0]?.id

      await updateACL({
        ...currentACL,
        [type]: [...(currentACL?.[type] || []), { roleId, read, write }],
      })

      return
    }

    // User ACL
    await updateACL({
      ...currentACL,
      [type]: [...(currentACL?.[type] || []), { userId, read, write }],
    })
  }
}
