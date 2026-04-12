import { describe, expect, it } from 'bun:test'
import { getUploadSecurityConfigForTests } from './security'
import type { WabeContext } from '../server/interface'

const makeContext = (fileConfig: Record<string, any> = {}): WabeContext<any> =>
	({
		wabe: {
			config: {
				isProduction: false,
				file: fileConfig,
			},
		},
	}) as any

describe('File upload security config', () => {
	it('should be enabled by default (even outside production)', () => {
		const context = makeContext({})
		const config = getUploadSecurityConfigForTests(context)
		expect(config.enabled).toBe(true)
	})

	it('should be disabled only when explicitly set to false', () => {
		const context = makeContext({ security: { enabled: false } })
		const config = getUploadSecurityConfigForTests(context)
		expect(config.enabled).toBe(false)
	})

	it('should use default max file size when not configured', () => {
		const context = makeContext({})
		const config = getUploadSecurityConfigForTests(context)
		expect(config.maxFileSizeBytes).toBe(10 * 1024 * 1024)
	})

	it('should use custom max file size when configured', () => {
		const context = makeContext({ security: { maxFileSizeBytes: 5_000_000 } })
		const config = getUploadSecurityConfigForTests(context)
		expect(config.maxFileSizeBytes).toBe(5_000_000)
	})

	it('should use default allowed MIME types when not configured', () => {
		const context = makeContext({})
		const config = getUploadSecurityConfigForTests(context)
		expect(config.allowedMimeTypes).toContain('image/jpeg')
		expect(config.allowedMimeTypes).toContain('application/pdf')
	})

	it('should use default allowed extensions when not configured', () => {
		const context = makeContext({})
		const config = getUploadSecurityConfigForTests(context)
		expect(config.allowedExtensions).toContain('jpg')
		expect(config.allowedExtensions).toContain('pdf')
	})

	it('should not randomize filenames outside production by default', () => {
		const context = makeContext({})
		const config = getUploadSecurityConfigForTests(context)
		expect(config.randomizeFileName).toBe(false)
	})

	it('should randomize filenames in production by default', () => {
		const context = {
			wabe: {
				config: {
					isProduction: true,
					file: {},
				},
			},
		} as any
		const config = getUploadSecurityConfigForTests(context)
		expect(config.randomizeFileName).toBe(true)
	})
})
