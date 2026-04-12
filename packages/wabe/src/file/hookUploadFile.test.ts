import { describe, expect, it } from 'bun:test'

const ALLOWED_URL_PROTOCOLS = ['https:']

const validateFileUrl = (url: string): void => {
	let parsed: URL
	try {
		parsed = new URL(url)
	} catch {
		throw new Error('Invalid file URL')
	}

	if (!ALLOWED_URL_PROTOCOLS.includes(parsed.protocol)) throw new Error('File URL must use HTTPS')

	if (
		parsed.hostname === 'localhost' ||
		parsed.hostname === '127.0.0.1' ||
		parsed.hostname === '[::1]'
	)
		throw new Error('File URL must not point to localhost')
}

describe('validateFileUrl', () => {
	it('should accept valid HTTPS URLs', () => {
		expect(() => validateFileUrl('https://cdn.example.com/image.png')).not.toThrow()
		expect(() => validateFileUrl('https://storage.googleapis.com/bucket/file.pdf')).not.toThrow()
	})

	it('should reject HTTP URLs', () => {
		expect(() => validateFileUrl('http://example.com/image.png')).toThrow('File URL must use HTTPS')
	})

	it('should reject FTP URLs', () => {
		expect(() => validateFileUrl('ftp://example.com/file.txt')).toThrow('File URL must use HTTPS')
	})

	it('should reject file:// protocol', () => {
		expect(() => validateFileUrl('file:///etc/passwd')).toThrow('File URL must use HTTPS')
	})

	it('should reject localhost URLs', () => {
		expect(() => validateFileUrl('https://localhost/secret')).toThrow(
			'File URL must not point to localhost',
		)
		expect(() => validateFileUrl('https://localhost:3000/data')).toThrow(
			'File URL must not point to localhost',
		)
	})

	it('should reject 127.0.0.1 URLs', () => {
		expect(() => validateFileUrl('https://127.0.0.1/secret')).toThrow(
			'File URL must not point to localhost',
		)
	})

	it('should reject IPv6 loopback URLs', () => {
		expect(() => validateFileUrl('https://[::1]/secret')).toThrow(
			'File URL must not point to localhost',
		)
	})

	it('should reject invalid URLs', () => {
		expect(() => validateFileUrl('not-a-url')).toThrow('Invalid file URL')
		expect(() => validateFileUrl('')).toThrow('Invalid file URL')
	})

	it('should reject data: URIs', () => {
		expect(() => validateFileUrl('data:text/html,<script>alert(1)</script>')).toThrow(
			'File URL must use HTTPS',
		)
	})

	it('should reject javascript: protocol', () => {
		expect(() => validateFileUrl('javascript:alert(1)')).toThrow('File URL must use HTTPS')
	})
})
