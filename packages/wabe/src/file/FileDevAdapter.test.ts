import { describe, expect, it } from 'bun:test'
import { FileDevAdapter } from './FileDevAdapter'

describe('FileDevAdapter', () => {
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
})
