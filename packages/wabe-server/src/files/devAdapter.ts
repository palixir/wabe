import type { WabeFileAdapter } from '.'

export const fileDevAdapter: WabeFileAdapter = async (file: File) => file.name
