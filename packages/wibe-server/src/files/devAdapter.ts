import type { WibeFileAdapter } from '.'

export const fileDevAdapter: WibeFileAdapter = async (file: File) => file.name
