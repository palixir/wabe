import { afterEach, describe, expect, it } from 'bun:test'
import { access, constants, readFile, rm } from 'node:fs/promises'
import path from 'node:path'
import { FileDevAdapter } from './FileDevAdapter'

const NESTED_FILE_NAME = 'nested-test/sub-dir/version-1.ir.json'

const cleanupNestedFile = async () => {
	const bucketPath = path.resolve(process.cwd(), 'bucket')
	const rootDir = path.resolve(bucketPath, 'nested-test')

	try {
		await rm(rootDir, { recursive: true, force: true })
	} catch {
		// nothing to clean
	}
}

describe('FileDevAdapter', () => {
	afterEach(async () => {
		await cleanupNestedFile()
	})

	it('should reject path traversal on upload', async () => {
		const adapter = new FileDevAdapter()

		await expect(
			adapter.uploadFile(new File(['content'], '../evil.txt', { type: 'text/plain' })),
		).rejects.toThrow('Invalid file path')
	})

	it('should reject path traversal on read', async () => {
		const adapter = new FileDevAdapter()

		await expect(adapter.readFile('../evil.txt')).rejects.toThrow('Invalid file path')
	})

	it('should reject path traversal on delete', async () => {
		const adapter = new FileDevAdapter()

		await expect(adapter.deleteFile('../evil.txt')).rejects.toThrow('Invalid file path')
	})

	it('should support nested paths on upload, read and delete', async () => {
		const adapter = new FileDevAdapter()
		const port = 4242

		await adapter.uploadFile(
			new File([JSON.stringify({ ok: true })], NESTED_FILE_NAME, {
				type: 'application/json',
			}),
		)

		const expectedPath = path.resolve(process.cwd(), 'bucket', NESTED_FILE_NAME)

		await expect(access(expectedPath, constants.F_OK)).resolves.toBeNull()
		expect(await readFile(expectedPath, 'utf-8')).toEqual(JSON.stringify({ ok: true }))

		const url = await adapter.readFile(NESTED_FILE_NAME, { port })
		expect(url).toEqual(`http://127.0.0.1:${port}/bucket/${NESTED_FILE_NAME}`)

		await adapter.deleteFile(NESTED_FILE_NAME)
		await expect(access(expectedPath, constants.F_OK)).rejects.toThrow()

		const missingUrl = await adapter.readFile(NESTED_FILE_NAME, { port })
		expect(missingUrl).toBeNull()
	})
})
