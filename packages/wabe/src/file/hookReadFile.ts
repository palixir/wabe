import type { HookObject } from '../hooks/HookObject'
import type { WabeFile } from './interface'

const isWabeFile = (value: unknown): value is WabeFile =>
	typeof value === 'object' && value !== null && 'name' in (value as Record<string, unknown>)

const getFile = async (hookObject: HookObject<any, any>) => {
	const schema = hookObject.context.wabe.config.schema?.classes?.find(
		(currentClass) => currentClass.name === hookObject.className,
	)

	if (!schema) return

	const urlCacheInSeconds = hookObject.context.wabe.config.file?.urlCacheInSeconds ?? 3600 * 24

	// After read we get the file URL and we update the field url with an URL.
	// For security purpose we recommend to use a presigned URL
	await Promise.all(
		Object.entries(schema.fields)
			.filter(([_, value]) => value.type === 'File')
			.map(async ([fieldName]) => {
				const rawFileInfo = hookObject.object?.[fieldName as keyof typeof hookObject.object]

				if (!isWabeFile(rawFileInfo)) return

				const fileInfo: WabeFile = rawFileInfo
				const fileName = fileInfo.name

				if (!fileName && fileInfo.url) return fileInfo.url

				const fileUrlGeneratedAt = fileInfo.urlGeneratedAt
					? new Date(fileInfo.urlGeneratedAt)
					: undefined

				if (
					fileUrlGeneratedAt &&
					fileUrlGeneratedAt.getTime() + urlCacheInSeconds * 1000 > Date.now()
				)
					return

				if (!hookObject.context.wabe.controllers.file) throw new Error('No file adapter found')

				const fileUrlFromBucket = await hookObject.context.wabe.controllers.file?.readFile(fileName)
				if (!fileUrlFromBucket) return

				const newUrl = fileUrlFromBucket
				const newUrlGeneratedAt = new Date()

				const updatedFile: WabeFile = {
					...fileInfo,
					urlGeneratedAt: newUrlGeneratedAt,
					url: newUrl,
				}

				// Mutate the object returned to the caller so AfterRead effects are visible immediately
				;(hookObject.object as Record<string, unknown>)[fieldName] = updatedFile

				if (!hookObject.object?.id) return

				return hookObject.context.wabe.controllers.database.updateObject({
					className: hookObject.className,
					context: hookObject.context,
					id: hookObject.object.id,
					data: {
						[fieldName]: updatedFile,
					},
					_skipHooks: true,
				})
			}),
	)
}

export const defaultAfterReadFile = (hookObject: HookObject<any, any>) => getFile(hookObject)
