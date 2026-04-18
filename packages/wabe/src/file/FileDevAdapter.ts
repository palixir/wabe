import { writeFile, mkdir, rm, access, constants } from 'node:fs/promises'
import path from 'node:path'
import type { FileAdapter, ReadFileOptions } from '.'

export class FileDevAdapter implements FileAdapter {
	private basePath = 'bucket'
	private rootPath = process.cwd()
	private getSafeFilePath(fileName: string) {
		const bucketPath = path.resolve(this.rootPath, this.basePath)
		const normalizedFileName = fileName.split('/').filter(Boolean).join(path.sep)
		const resolvedFilePath = path.resolve(bucketPath, normalizedFileName)
		const isInsideBucket =
			resolvedFilePath === bucketPath || resolvedFilePath.startsWith(`${bucketPath}${path.sep}`)

		if (!isInsideBucket) throw new Error('Invalid file path')

		return resolvedFilePath
	}

	private toUrlPath(fileName: string) {
		return fileName
			.split('/')
			.filter(Boolean)
			.map((segment) => encodeURIComponent(segment))
			.join('/')
	}

	async uploadFile(file: File): Promise<void> {
		const safePath = this.getSafeFilePath(file.name)
		const parentDir = path.dirname(safePath)

		await mkdir(parentDir, { recursive: true })

		const fileType = file.type

		let fileContent: Buffer

		if (fileType.startsWith('text') || fileType.includes('json')) {
			const textContent = await file.text()
			fileContent = Buffer.from(textContent, 'utf-8')
		} else {
			const arrayBuffer = await file.arrayBuffer()
			fileContent = Buffer.from(arrayBuffer)
		}

		await writeFile(safePath, fileContent)
	}

	async readFile(fileName: string, options?: ReadFileOptions): Promise<string | null> {
		const filePath = this.getSafeFilePath(fileName)

		try {
			await access(filePath, constants.F_OK)
			return `http://127.0.0.1:${options?.port || 3001}/${this.basePath}/${this.toUrlPath(fileName)}`
		} catch {
			return null
		}
	}

	async deleteFile(fileName: string): Promise<void> {
		const filePath = this.getSafeFilePath(fileName)

		try {
			await access(filePath, constants.F_OK)

			await rm(filePath)
		} catch {
			// Do nothing
		}
	}
}
