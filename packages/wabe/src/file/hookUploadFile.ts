import type { HookObject } from '../hooks/HookObject'
import { secureUploadedFile } from './security'

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
