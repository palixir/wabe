import { writeFile, mkdir, rm, access, constants } from 'node:fs/promises'
import path from 'node:path'
import type { FileAdapter, ReadFileOptions } from '.'

export class FileDevAdapter implements FileAdapter {
	private basePath = 'bucket'
	private rootPath = process.cwd()

	async uploadFile(file: File): Promise<void> {
		const fullPath = path.join(this.rootPath, this.basePath)

		await mkdir(fullPath, { recursive: true })

		const fileType = file.type

		let fileContent: Buffer

		if (fileType.startsWith('text') || fileType.includes('json')) {
			const textContent = await file.text()
			fileContent = Buffer.from(textContent, 'utf-8')
		} else {
			const arrayBuffer = await file.arrayBuffer()
			fileContent = Buffer.from(arrayBuffer)
		}

		await writeFile(path.join(fullPath, file.name), fileContent)
	}

	async readFile(fileName: string, options?: ReadFileOptions): Promise<string | null> {
		const filePath = path.join(this.rootPath, this.basePath, fileName)

		try {
			await access(filePath, constants.F_OK)
			return `http://127.0.0.1:${options?.port || 3001}/${this.basePath}/${fileName}`
		} catch {
			return null
		}
	}

	async deleteFile(fileName: string): Promise<void> {
		const filePath = path.join(this.rootPath, this.basePath, fileName)

		try {
			await access(filePath, constants.F_OK)

			await rm(filePath)
		} catch {
			// Do nothing
		}
	}
}
