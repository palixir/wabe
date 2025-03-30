import type { WabeContext } from '../server/interface'
import type { WabeTypes } from '../server'

type IsScalar<T> = T extends string | number | boolean | Date ? true : false

type IsArray<T> = T extends Array<any> ? true : false

type IsObject<T, K extends WabeTypes> = T extends object
  ? T extends K['types'][keyof K['types']]
    ? false
    : true
  : false

type ExtractType<
  T extends WabeTypes,
  ClassName extends keyof T['types'],
  FieldName extends keyof T['types'][ClassName],
> = T['types'][ClassName][FieldName]

type ExtractWhereType<
  T extends WabeTypes,
  ClassName extends keyof T['where'],
  FieldName extends keyof T['where'][ClassName],
> = T['where'][ClassName][FieldName]

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

type WhereAggregation<T extends WabeTypes, K = keyof T['where']> = {
  [P in keyof T['where'][K]]: IsScalar<ExtractWhereType<T, K, P>> extends false
    ? WhereObject<Partial<ExtractWhereType<T, K, P>>>
    : WhereScalar<ExtractWhereType<T, K, P>>
}

type WhereConditional<T extends WabeTypes, K = keyof T['where']> = {
  OR?: Array<WhereType<T, K>>
  AND?: Array<WhereType<T, K>>
}

export type WhereType<T extends WabeTypes, K = keyof T['where']> = Partial<
  WhereAggregation<T, K>
> &
  WhereConditional<T, K>

type SelectObject<T, K extends WabeTypes, Depth extends number = 3> = {
  [P in keyof T]: IsScalar<T[P]> extends true
    ? boolean
    : IsArray<T[P]> extends true
      ? T[P] extends Array<infer Item>
        ?
            | (Depth extends 0
                ? boolean
                : SelectObject<Partial<Item>, K, Decrement<Depth>>)
            | boolean
        : boolean
      : IsObject<[P], K> extends true
        ?
            | (Depth extends 0
                ? boolean
                : SelectObject<Partial<T[P]>, K, Decrement<Depth>>)
            | boolean
        : boolean
}

type Decrement<N extends number> = [-1, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10][N]

export type SelectType<
  T extends WabeTypes,
  K extends keyof T['types'],
  U extends keyof T['types'][K],
  Depth extends number = 3,
> = Partial<{
  [P in U]: IsScalar<ExtractType<T, K, P>> extends true
    ? boolean
    : IsArray<ExtractType<T, K, P>> extends true
      ? ExtractType<T, K, P> extends Array<infer Item>
        ?
            | (Depth extends 0
                ? boolean
                : SelectObject<Partial<Item>, T, Decrement<Depth>>)
            | boolean
        : boolean
      : ExtractType<T, K, P> extends object
        ?
            | (Depth extends 0
                ? boolean
                : SelectObject<
                    Partial<ExtractType<T, K, P>>,
                    T,
                    Decrement<Depth>
                  >)
            | boolean
        : boolean
}>

export type OrderType<
  T extends WabeTypes,
  K extends keyof T['types'],
  U extends keyof T['types'][K],
> = Record<U, 'ASC' | 'DESC'>

export type OutputType<
  T extends WabeTypes,
  K extends keyof T['types'],
  U extends keyof T['types'][K],
> = (Pick<T['types'][K], U> & { id: string }) | null

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
  context: WabeContext<T>
}

export interface GetObjectOptions<
  T extends WabeTypes,
  K extends keyof T['types'],
  U extends keyof T['types'][K],
> {
  className: K
  id: string
  where?: WhereType<T, K>
  context: WabeContext<T>
  skipHooks?: boolean
  select?: SelectType<T, K, U>
  isGraphQLCall?: boolean
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
  offset?: number
  first?: number
  context: WabeContext<T>
  skipHooks?: boolean
  select?: SelectType<T, K, W>
  isGraphQLCall?: boolean
}

export interface CreateObjectOptions<
  T extends WabeTypes,
  K extends keyof T['types'],
  U extends keyof T['types'][K],
  W extends keyof T['types'][K],
> {
  className: K
  data: MutationData<T, K, U>
  context: WabeContext<T>
  select?: SelectType<T, K, W>
  isGraphQLCall?: boolean
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
  offset?: number
  first?: number
  order?: OrderType<T, U, X>
  context: WabeContext<T>
  select?: SelectType<T, K, W>
  isGraphQLCall?: boolean
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
  context: WabeContext<T>
  skipHooks?: boolean
  select?: SelectType<T, K, W>
  isGraphQLCall?: boolean
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
  offset?: number
  first?: number
  context: WabeContext<T>
  skipHooks?: boolean
  select?: SelectType<T, K, W>
  isGraphQLCall?: boolean
}

export interface DeleteObjectOptions<
  T extends WabeTypes,
  K extends keyof T['types'],
  U extends keyof T['types'][K],
> {
  className: K
  id: string
  where?: WhereType<T, K>
  context: WabeContext<T>
  select?: SelectType<T, K, U>
  isGraphQLCall?: boolean
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
  offset?: number
  first?: number
  context: WabeContext<T>
  select?: SelectType<T, K, W>
  isGraphQLCall?: boolean
}

export interface DatabaseAdapter<T extends WabeTypes> {
  connect(): Promise<any>
  close(): Promise<any>

  createClassIfNotExist(
    className: string,
    context: WabeContext<T>,
  ): Promise<any>

  clearDatabase(): Promise<void>

  count<K extends keyof T['types']>(params: CountOptions<T, K>): Promise<number>

  getObject<K extends keyof T['types'], U extends keyof T['types'][K]>(
    params: GetObjectOptions<T, K, U>,
  ): Promise<OutputType<T, K, U>>
  getObjects<
    K extends keyof T['types'],
    U extends keyof T['types'][K],
    W extends keyof T['types'][K],
  >(params: GetObjectsOptions<T, K, U, W>): Promise<OutputType<T, K, W>[]>

  createObject<
    K extends keyof T['types'],
    U extends keyof T['types'][K],
    W extends keyof T['types'][K],
  >(params: CreateObjectOptions<T, K, U, W>): Promise<{ id: string }>
  createObjects<
    K extends keyof T['types'],
    U extends keyof T['types'][K],
    W extends keyof T['types'][K],
    X extends keyof T['types'][K],
  >(params: CreateObjectsOptions<T, K, U, W, X>): Promise<Array<{ id: string }>>

  updateObject<
    K extends keyof T['types'],
    U extends keyof T['types'][K],
    W extends keyof T['types'][K],
  >(params: UpdateObjectOptions<T, K, U, W>): Promise<{ id: string }>
  updateObjects<
    K extends keyof T['types'],
    U extends keyof T['types'][K],
    W extends keyof T['types'][K],
    X extends keyof T['types'][K],
  >(params: UpdateObjectsOptions<T, K, U, W, X>): Promise<Array<{ id: string }>>

  deleteObject<K extends keyof T['types'], U extends keyof T['types'][K]>(
    params: DeleteObjectOptions<T, K, U>,
  ): Promise<void>
  deleteObjects<
    K extends keyof T['types'],
    U extends keyof T['types'][K],
    W extends keyof T['types'][K],
  >(params: DeleteObjectsOptions<T, K, U, W>): Promise<void>
}
