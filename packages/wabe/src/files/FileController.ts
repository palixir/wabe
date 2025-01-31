import type { FileAdapter } from './interface'

export class FileController implements FileAdapter {
  public adapter: FileAdapter

  constructor(adapter: FileAdapter) {
    this.adapter = adapter
  }

  uploadFile(file: File | Blob) {
    return this.adapter.uploadFile(file)
  }

  readFile(fileName: string) {
    return this.adapter.readFile(fileName)
  }

  deleteFile(fileName: string) {
    return this.adapter.deleteFile(fileName)
  }
}
