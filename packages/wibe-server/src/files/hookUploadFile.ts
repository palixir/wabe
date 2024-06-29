import { WibeApp } from '..'
import type { HookObject } from '../hooks/HookObject'

const handleFile = async (hookObject: HookObject<any>) => {
	const newData = hookObject.getNewData()

	const schema = WibeApp.config.schema.class.find(
		(currentClass) => currentClass.name === hookObject.className,
	)

	if (!schema) return

	await Promise.all(
		Object.keys(newData).map(async (keyName) => {
			if (schema.fields[keyName].type !== 'File') return

			if (WibeApp.config.file.adapter !== undefined)
				hookObject.upsertNewData(
					keyName,
					await WibeApp.config.file.adapter(newData[keyName]),
				)
		}),
	)
}

export const defaultBeforeCreateUpload = (hookObject: HookObject<any>) =>
	handleFile(hookObject)

export const defaultBeforeUpdateUpload = (hookObject: HookObject<any>) =>
	handleFile(hookObject)
