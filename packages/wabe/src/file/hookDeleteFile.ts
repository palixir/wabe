import type { HookObject } from '../hooks/HookObject'
import { contextWithRoot } from '../utils/export'
import type { WabeContext } from '../server/interface'
import type { WabeFile } from './interface'

const isWabeFile = (value: unknown): value is WabeFile =>
	typeof value === 'object' && value !== null && 'name' in (value as Record<string, unknown>)

/**
 * Returns true if any remaining object (across every File field of every class) still references the
 * given file name. Prevents deleting a physical file that is shared by several records: deleting one
 * record must not break the others. The deleted record is already gone at AfterDelete time, so it is
 * never counted here.
 */
const isFileStillReferenced = async (
	context: WabeContext<any>,
	fileName: string,
): Promise<boolean> => {
	const classes = context.wabe.config.schema?.classes || []

	for (const currentClass of classes) {
		const fileFields = Object.entries(currentClass.fields).filter(
			([_, value]) => value.type === 'File',
		)

		for (const [fieldName] of fileFields) {
			const count = await context.wabe.controllers.database.count({
				className: currentClass.name,
				// @ts-expect-error dynamic file field filter from schema
				where: { [fieldName]: { name: { equalTo: fileName } } },
				context: contextWithRoot(context),
			})

			if (count > 0) return true
		}
	}

	return false
}

const deleteFile = async (hookObject: HookObject<any, any>) => {
	const schema = hookObject.context.wabe.config.schema?.classes?.find(
		(currentClass) => currentClass.name === hookObject.className,
	)

	if (!schema) return

	await Promise.all(
		Object.entries(schema.fields)
			.filter(([_, value]) => value.type === 'File')
			.map(async ([fieldName]) => {
				const rawFileInfo =
					hookObject.originalObject?.[fieldName as keyof typeof hookObject.originalObject]

				if (!isWabeFile(rawFileInfo)) return

				const fileName = rawFileInfo.name

				if (!fileName) return

				if (!hookObject.context.wabe.controllers.file) throw new Error('No file adapter found')

				// Only delete the physical file once no other record references it.
				if (await isFileStillReferenced(hookObject.context, fileName)) return

				await hookObject.context.wabe.controllers.file?.deleteFile(fileName)
			}),
	)
}

export const defaultAfterDeleteFile = (hookObject: HookObject<any, any>) => deleteFile(hookObject)
