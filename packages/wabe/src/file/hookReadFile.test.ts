import { describe, expect, it, mock } from 'bun:test'
import { defaultAfterReadFile } from './hookReadFile'

describe('hookReadFile', () => {
	it('should persist refreshed file URLs with an internal root context', async () => {
		const updateObject = mock(async () => ({ id: 'object-id' }))
		const readFile = mock(async (fileName: string) => `https://bucket.example/${fileName}`)

		const hookObject = {
			className: 'Test',
			context: {
				isRoot: false,
				user: { id: 'user-id' },
				wabe: {
					config: {
						schema: {
							classes: [
								{
									name: 'Test',
									fields: {
										file: { type: 'File' },
									},
								},
							],
						},
						file: { urlCacheInSeconds: 0 },
					},
					controllers: {
						file: { readFile },
						database: { updateObject },
					},
				},
			},
			object: {
				id: 'object-id',
				file: {
					name: 'avatar.png',
				},
			},
		}

		await defaultAfterReadFile(hookObject as any)

		expect(readFile).toHaveBeenCalledTimes(1)
		expect(updateObject).toHaveBeenCalledTimes(1)

		// @ts-expect-error - mock.calls is not typed
		const updateInput = updateObject.mock.calls[0]?.[0] as any
		expect(updateInput.className).toBe('Test')
		expect(updateInput.id).toBe('object-id')
		expect(updateInput._skipHooks).toBe(true)
		expect(updateInput.context.isRoot).toBe(true)
		expect(updateInput.context.user?.id).toBe('user-id')
		expect(updateInput.data.file.url).toBe('https://bucket.example/avatar.png')
		expect(new Date(updateInput.data.file.urlGeneratedAt)).toBeDate()
	})
})
