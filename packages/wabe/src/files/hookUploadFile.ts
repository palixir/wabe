import type { HookObject } from '../hooks/HookObject'

const handleFile = async (hookObject: HookObject<any>) => {
	const newData = hookObject.getNewData()

	const schema = hookObject.context.wabe.config.schema?.classes?.find(
		(currentClass) => currentClass.name === hookObject.className,
	)

	if (!schema) return

	await Promise.all(
		Object.keys(newData).map(async (keyName) => {
			if (schema.fields[keyName].type !== 'File') return

			if (hookObject.context.wabe.config.file?.adapter !== undefined)
				hookObject.upsertNewData(
					keyName,
					await hookObject.context.wabe.config.file.adapter(newData[keyName]),
				)
		}),
	)
}

export const defaultBeforeCreateUpload = (hookObject: HookObject<any>) =>
	handleFile(hookObject)

export const defaultBeforeUpdateUpload = (hookObject: HookObject<any>) =>
	handleFile(hookObject)
