import type { WabeContext } from '../../server/interface'
import type { WabeTypes } from '../../server'
import type { Scalars } from '../../../generated/wabe'

type IsScalar<T> = T extends
  | Scalars['String']['output']
  | Scalars['Int']['output']
  | Scalars['Boolean']['output']
  | Scalars['Date']['output']
  ? true
  : false

type ExtractType<
  T extends WabeTypes,
  ClassName extends keyof T['types'],
  FieldName extends keyof T['types'][ClassName],
> = T['types'][ClassName][FieldName]

type WhereScalar<T> = {
  equalTo?: T
  notEqualTo?: T
  greaterThan?: T
  lessThan?: T
  greaterThanOrEqualTo?: T
  lessThanOrEqualTo?: T
  in?: T[]
  notIn?: T[]
  contains?: T
  notContains?: T
}

type WhereObject<T> = {
  [P in keyof T]: IsScalar<T[P]> extends false
    ? WhereObject<Partial<T[P]>>
    : WhereScalar<T[P]>
}

type WhereAggregation<T extends WabeTypes, K extends keyof T['types']> = {
  [P in keyof T['types'][K]]: IsScalar<ExtractType<T, K, P>> extends false
    ? WhereObject<Partial<ExtractType<T, K, P>>>
    : WhereScalar<ExtractType<T, K, P>>
}

type WhereConditional<T extends WabeTypes, K extends keyof T['types']> = {
  OR?: Array<WhereType<T, K>>
  AND?: Array<WhereType<T, K>>
}

export type WhereType<
  T extends WabeTypes,
  K extends keyof T['types'],
> = Partial<WhereAggregation<T, K>> & WhereConditional<T, K>

export type OrderType<
  T extends WabeTypes,
  K extends keyof T['types'],
  U extends keyof T['types'][K],
> = Record<U, 'ASC' | 'DESC'>

export interface AdapterOptions {
  databaseUrl: string
  databaseName: string
}

export type MutationData<
  T extends WabeTypes,
  K extends keyof T['types'],
  U extends keyof T['types'][K],
> = Record<U, any>

export interface CountOptions<T extends WabeTypes, K extends keyof T['types']> {
  className: K
  where?: WhereType<T, K>
  context: WabeContext<any>
}

// TODO: It could be cool if fields type supports something like user.id, user.email
export interface GetObjectOptions<
  T extends WabeTypes,
  K extends keyof T['types'],
  U extends keyof T['types'][K],
> {
  className: K
  id: string
  where?: WhereType<T, K>
  fields: Array<U | '*'>
  context: WabeContext<any>
  skipHooks?: boolean
}

export interface GetObjectsOptions<
  T extends WabeTypes,
  K extends keyof T['types'],
  U extends keyof T['types'][K],
  W extends keyof T['types'][K],
> {
  className: K
  where?: WhereType<T, K>
  order?: OrderType<T, K, U>
  fields: Array<W | '*'>
  offset?: number
  first?: number
  context: WabeContext<any>
  skipHooks?: boolean
}

export interface CreateObjectOptions<
  T extends WabeTypes,
  K extends keyof T['types'],
  U extends keyof T['types'][K],
  W extends keyof T['types'][K],
> {
  className: K
  data: MutationData<T, K, U>
  fields: Array<W | '*'>
  context: WabeContext<any>
}
export interface CreateObjectsOptions<
  T extends WabeTypes,
  K extends keyof T['types'],
  U extends keyof T['types'][K],
  W extends keyof T['types'][K],
  X extends keyof T['types'][K],
> {
  className: K
  data: Array<MutationData<T, K, U>>
  fields: Array<W | '*'>
  offset?: number
  first?: number
  order?: OrderType<T, U, X>
  context: WabeContext<any>
}

export interface UpdateObjectOptions<
  T extends WabeTypes,
  K extends keyof T['types'],
  U extends keyof T['types'][K],
  W extends keyof T['types'][K],
> {
  className: K
  id: string
  where?: WhereType<T, K>
  data: MutationData<T, K, U>
  fields: Array<W | '*'>
  context: WabeContext<any>
}

export interface UpdateObjectsOptions<
  T extends WabeTypes,
  K extends keyof T['types'],
  U extends keyof T['types'][K],
  W extends keyof T['types'][K],
  X extends keyof T['types'][K],
> {
  className: K
  where: WhereType<T, K>
  order?: OrderType<T, K, X>
  data: MutationData<T, K, U>
  fields: Array<W | '*'>
  offset?: number
  first?: number
  context: WabeContext<any>
}

export interface DeleteObjectOptions<
  T extends WabeTypes,
  K extends keyof T['types'],
  U extends keyof T['types'][K],
> {
  className: K
  id: string
  where?: WhereType<T, K>
  fields: Array<U | '*'>
  context: WabeContext<any>
}

export interface DeleteObjectsOptions<
  T extends WabeTypes,
  K extends keyof T['types'],
  U extends keyof T['types'][K],
  W extends keyof T['types'][K],
> {
  className: K
  where: WhereType<T, K>
  order?: OrderType<T, K, U>
  fields: Array<W | '*'>
  offset?: number
  first?: number
  context: WabeContext<any>
}

export type OutputType<
  T extends WabeTypes,
  K extends keyof T['types'],
  U extends keyof T['types'][K],
> = Pick<T['types'][K], U> & { id: string }

export interface DatabaseAdapter {
  connect(): Promise<any>
  close(): Promise<any>

  createClassIfNotExist(
    className: string,
    context: WabeContext<any>,
  ): Promise<any>

  clearDatabase(): Promise<void>

  count<T extends WabeTypes, K extends keyof T['types']>(
    params: CountOptions<T, K>,
  ): Promise<number>

  getObject<
    T extends WabeTypes,
    K extends keyof T['types'],
    U extends keyof T['types'][K],
  >(params: GetObjectOptions<T, K, U>): Promise<OutputType<T, K, U>>
  getObjects<
    T extends WabeTypes,
    K extends keyof T['types'],
    U extends keyof T['types'][K],
    W extends keyof T['types'][K],
  >(params: GetObjectsOptions<T, K, U, W>): Promise<OutputType<T, K, W>[]>

  createObject<
    T extends WabeTypes,
    K extends keyof T['types'],
    U extends keyof T['types'][K],
    W extends keyof T['types'][K],
  >(params: CreateObjectOptions<T, K, U, W>): Promise<OutputType<T, K, W>>
  createObjects<
    T extends WabeTypes,
    K extends keyof T['types'],
    U extends keyof T['types'][K],
    W extends keyof T['types'][K],
    X extends keyof T['types'][K],
  >(params: CreateObjectsOptions<T, K, U, W, X>): Promise<OutputType<T, K, W>[]>

  updateObject<
    T extends WabeTypes,
    K extends keyof T['types'],
    U extends keyof T['types'][K],
    W extends keyof T['types'][K],
  >(params: UpdateObjectOptions<T, K, U, W>): Promise<OutputType<T, K, W>>
  updateObjects<
    T extends WabeTypes,
    K extends keyof T['types'],
    U extends keyof T['types'][K],
    W extends keyof T['types'][K],
    X extends keyof T['types'][K],
  >(params: UpdateObjectsOptions<T, K, U, W, X>): Promise<OutputType<T, K, W>[]>

  deleteObject<
    T extends WabeTypes,
    K extends keyof T['types'],
    U extends keyof T['types'][K],
  >(params: DeleteObjectOptions<T, K, U>): Promise<void>
  deleteObjects<
    T extends WabeTypes,
    K extends keyof T['types'],
    U extends keyof T['types'][K],
    W extends keyof T['types'][K],
  >(params: DeleteObjectsOptions<T, K, U, W>): Promise<void>
}
