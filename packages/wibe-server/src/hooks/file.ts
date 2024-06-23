import { WibeApp } from '../..'
import type { HookObject } from './HookObject'

const uploadBlob = async (file: File) => {
	// await Bun.write('a.txt', file)

	return 'acustomurl'
}

const handleFile = async (hookObject: HookObject<any>) => {
	// console.log(hookObject.getNewData())
	const newData = hookObject.getNewData()

	const schema = WibeApp.config.schema.class.find(
		(currentClass) => currentClass.name === hookObject.className,
	)

	if (!schema) return

	await Promise.all(
		Object.keys(newData).map(async (keyName) => {
			if (schema.fields[keyName].type !== 'File') return

			hookObject.upsertNewData(
				keyName,
				await uploadBlob(newData[keyName]),
			)
		}),
	)
}

export const defaultBeforeCreateUpload = (hookObject: HookObject<any>) =>
	handleFile(hookObject)

export const defaultBeforeUpdateUpload = (hookObject: HookObject<any>) =>
	handleFile(hookObject)
