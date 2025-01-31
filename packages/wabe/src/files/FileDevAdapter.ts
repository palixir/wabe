import { writeFile, mkdir, rm, access, constants } from 'node:fs/promises'
import type { FileAdapter } from '.'

export class FileDevAdapter implements FileAdapter {
  private basePath: string

  constructor(basePath: string) {
    this.basePath = basePath
  }

  async uploadFile(file: File | Blob): Promise<void> {
    await mkdir(this.basePath, { recursive: true })

    await writeFile(`${this.basePath}/${file.name}`, await file.text())
  }

  async readFile(fileName: string): Promise<string | null> {
    const filePath = `${this.basePath}/${fileName}`

    try {
      await access(filePath, constants.F_OK) // Vérifie si le fichier existe
      return filePath
    } catch {
      return null
    }
  }

  async deleteFile(fileName: string): Promise<void> {
    await rm(`${this.basePath}/${fileName}`)
  }
}
