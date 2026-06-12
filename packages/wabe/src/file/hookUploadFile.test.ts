import { describe, expect, it } from 'bun:test'
import { validateFileUrl } from './hookUploadFile'

const PRIVATE_ADDRESS_ERROR = 'File URL must not point to a private or reserved address'

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
		expect(() => validateFileUrl('https://localhost/secret')).toThrow(PRIVATE_ADDRESS_ERROR)
		expect(() => validateFileUrl('https://localhost:3000/data')).toThrow(PRIVATE_ADDRESS_ERROR)
	})

	it('should reject 127.0.0.1 URLs', () => {
		expect(() => validateFileUrl('https://127.0.0.1/secret')).toThrow(PRIVATE_ADDRESS_ERROR)
	})

	it('should reject IPv6 loopback URLs', () => {
		expect(() => validateFileUrl('https://[::1]/secret')).toThrow(PRIVATE_ADDRESS_ERROR)
	})

	it('should reject the cloud metadata endpoint (SSRF)', () => {
		expect(() => validateFileUrl('https://169.254.169.254/latest/meta-data/')).toThrow(
			PRIVATE_ADDRESS_ERROR,
		)
	})

	it('should reject private IPv4 ranges (SSRF)', () => {
		expect(() => validateFileUrl('https://10.0.0.5/file')).toThrow(PRIVATE_ADDRESS_ERROR)
		expect(() => validateFileUrl('https://192.168.1.10/file')).toThrow(PRIVATE_ADDRESS_ERROR)
		expect(() => validateFileUrl('https://172.16.0.1/file')).toThrow(PRIVATE_ADDRESS_ERROR)
		expect(() => validateFileUrl('https://172.31.255.255/file')).toThrow(PRIVATE_ADDRESS_ERROR)
	})

	it('should reject IPv6 unique-local and link-local ranges (SSRF)', () => {
		expect(() => validateFileUrl('https://[fd00::1]/file')).toThrow(PRIVATE_ADDRESS_ERROR)
		expect(() => validateFileUrl('https://[fe80::1]/file')).toThrow(PRIVATE_ADDRESS_ERROR)
	})

	it('should accept a public IPv4 host that is close to a private range', () => {
		expect(() => validateFileUrl('https://172.32.0.1/file')).not.toThrow()
		expect(() => validateFileUrl('https://8.8.8.8/file')).not.toThrow()
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
