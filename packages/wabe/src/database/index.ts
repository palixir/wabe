import type { WabeTypes } from '../server'
import type { DatabaseAdapter } from './interface'

export interface DatabaseConfig<T extends WabeTypes> {
  adapter: DatabaseAdapter<T>
}

export * from './DatabaseController'
export * from './interface'
