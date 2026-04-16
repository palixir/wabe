import type { HookObject } from '../hooks/HookObject'
import type { WabeFile } from './interface'

const isWabeFile = (value: unknown): value is WabeFile =>
	typeof value === 'object' && value !== null && 'name' in (value as Record<string, unknown>)

const deleteFile = async (hookObject: HookObject<any, any>) => {
	const schema = hookObject.context.wabe.config.schema?.classes?.find(
		(currentClass) => currentClass.name === hookObject.className,
	)

	if (!schema) return

	await Promise.all(
		Object.entries(schema.fields)
			.filter(([_, value]) => value.type === 'File')
			.map(([fieldName]) => {
				const rawFileInfo =
					hookObject.originalObject?.[fieldName as keyof typeof hookObject.originalObject]

				if (!isWabeFile(rawFileInfo)) return Promise.resolve()

				const fileName = rawFileInfo.name

				if (!fileName) return Promise.resolve()

				if (!hookObject.context.wabe.controllers.file) throw new Error('No file adapter found')

				return hookObject.context.wabe.controllers.file?.deleteFile(fileName)
			}),
	)
}

export const defaultAfterDeleteFile = (hookObject: HookObject<any, any>) => deleteFile(hookObject)
