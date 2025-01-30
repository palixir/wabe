import type { HookObject } from '../hooks/HookObject'

const deleteFile = async (hookObject: HookObject<any, any>) => {
  const schema = hookObject.context.wabe.config.schema?.classes?.find(
    (currentClass) => currentClass.name === hookObject.className,
  )

  if (!schema) return

  Object.entries(schema.fields)
    .filter(([_, value]) => value.type === 'File')
    .map(async ([fieldName]) => {
      const fileName = hookObject.originalObject?.[fieldName]?.name as string

      if (!fileName) return

      if (hookObject.context.wabe.config.file?.adapter)
        await hookObject.context.wabe.config.file.adapter.deleteFile(fileName)
    })
}

export const defaultAfterDeleteFile = (hookObject: HookObject<any, any>) =>
  deleteFile(hookObject)
