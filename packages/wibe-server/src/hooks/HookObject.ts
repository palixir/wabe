import { WibeSchemaTypes } from "../../generated/wibe";

export class HookObject<
  T extends keyof WibeSchemaTypes,
  K extends keyof WibeSchemaTypes[T],
> {
  private data: Record<K, WibeSchemaTypes[T][K]>
  public className: T

  constructor({ data, className }: { className: T, data: Record<K, WibeSchemaTypes[T][K]> }) {
    this.data = data
    this.className = className
  }

  get({ field }: { field: K }) {
    return this.data[field]
  }

  set({ field, value }: { field: K; value: WibeSchemaTypes[T][K] }) {
    this.data[field] = value
  }
}
