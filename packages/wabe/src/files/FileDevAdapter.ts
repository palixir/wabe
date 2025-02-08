import { writeFile, mkdir, rm, access, constants } from 'node:fs/promises'
import path from 'node:path'
import type { FileAdapter } from '.'

export class FileDevAdapter implements FileAdapter {
  private basePath: string

  public rootPath = process.cwd()

  constructor(basePath: string) {
    this.basePath = basePath
  }

  async uploadFile(file: File | Blob): Promise<void> {
    const fullPath = path.join(this.rootPath, this.basePath)

    await mkdir(fullPath, { recursive: true })

    await writeFile(path.join(fullPath, file.name), await file.text())
  }

  async readFile(fileName: string): Promise<string | null> {
    const filePath = path.join(this.rootPath, this.basePath, fileName)

    try {
      await access(filePath, constants.F_OK)
      return filePath
    } catch {
      return null
    }
  }

  async deleteFile(fileName: string): Promise<void> {
    await rm(path.join(this.rootPath, this.basePath, fileName))
  }
}
