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

const handleFile = async (hookObject: HookObject<any, any>) => {
	const newData = hookObject.getNewData()

	const schema = hookObject.context.wabe.config.schema?.classes?.find(
		(currentClass) => currentClass.name === hookObject.className,
	)

	if (!schema) return

	const beforeUpload = hookObject.context.wabe.config.file?.beforeUpload

	await Promise.all(
		Object.keys(newData).map(async (keyName) => {
			const file = newData[keyName]?.file as File
			const url = newData[keyName]?.url as string

			if (!file && !url) return

			if (url) {
				validateFileUrl(url)

				hookObject.upsertNewData(keyName, {
					url,
					isPresignedUrl: false,
				})
				return
			}

			if (schema.fields[keyName]?.type !== 'File' || !(file instanceof File)) return

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
