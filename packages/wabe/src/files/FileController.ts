import type { Wabe } from '../server'
import type { DevWabeTypes } from '../utils/helper'
import type { FileAdapter, ReadFileOptions } from './interface'

export class FileController implements FileAdapter {
  public adapter: FileAdapter
  private wabe: Wabe<DevWabeTypes>

  constructor(adapter: FileAdapter, wabe: Wabe<any>) {
    this.adapter = adapter
    this.wabe = wabe
  }

  uploadFile(file: File) {
    return this.adapter.uploadFile(file)
  }

  readFile(fileName: string, options?: ReadFileOptions) {
    return this.adapter.readFile(fileName, {
      ...options,
      port: this.wabe.config.port,
    })
  }

  deleteFile(fileName: string) {
    return this.adapter.deleteFile(fileName)
  }
}
