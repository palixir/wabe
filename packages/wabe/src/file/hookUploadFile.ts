import type { HookObject } from '../hooks/HookObject'
import { secureUploadedFile } from './security'

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

const isFileInputCandidate = (
	value: unknown,
): value is Partial<{ file: unknown; url: unknown; name: unknown }> =>
	typeof value === 'object' && value !== null && !(value instanceof File)

const handleFile = async (hookObject: HookObject<any, any>) => {
	const newData = hookObject.getNewData()

	const schema = hookObject.context.wabe.config.schema?.classes?.find(
		(currentClass) => currentClass.name === hookObject.className,
	)

	if (!schema) return

	const beforeUpload = hookObject.context.wabe.config.file?.beforeUpload

	await Promise.all(
		Object.keys(newData).map(async (keyName) => {
			if (schema.fields[keyName]?.type !== 'File') return

			const candidate = newData[keyName]

			if (candidate instanceof File)
				throw new Error(
					`File field "${keyName}" must be provided as { file } or { url, name }, not a bare File instance`,
				)

			if (!isFileInputCandidate(candidate)) return

			const file = candidate.file instanceof File ? candidate.file : undefined
			const url = typeof candidate.url === 'string' ? candidate.url : undefined
			const name = typeof candidate.name === 'string' ? candidate.name : undefined

			if (!file && !url) return

			if (file && url)
				throw new Error(
					`File field "${keyName}" cannot have both "file" and "url" set at the same time`,
				)

			if (url) {
				validateFileUrl(url)

				const nextValue: { name?: string; url: string; isPresignedUrl: boolean } = {
					url,
					isPresignedUrl: false,
					...(name ? { name } : {}),
				}

				hookObject.upsertNewData(keyName, nextValue)
				return
			}

			if (!file) return

			if (!hookObject.context.wabe.controllers.file) throw new Error('No file adapter found')

			const fileFromBeforeUpload = (await beforeUpload?.(file, hookObject.context)) || file
			const fileToUpload = await secureUploadedFile(fileFromBeforeUpload, hookObject.context)

			// We upload the file and set the name of the file in the newData
			await hookObject.context.wabe.controllers.file?.uploadFile(fileToUpload)

			hookObject.upsertNewData(keyName, {
				name: fileToUpload.name,
				isPresignedUrl: true,
			})
		}),
	)
}

export const defaultBeforeCreateUpload = (hookObject: HookObject<any, any>) =>
	handleFile(hookObject)

export const defaultBeforeUpdateUpload = (hookObject: HookObject<any, any>) =>
	handleFile(hookObject)
