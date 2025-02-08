import type { HookObject } from '../hooks/HookObject'

const handleFile = async (hookObject: HookObject<any, any>) => {
  if (!hookObject.context.wabe.controllers.file)
    throw new Error('No file adapter found')

  const newData = hookObject.getNewData()

  const schema = hookObject.context.wabe.config.schema?.classes?.find(
    (currentClass) => currentClass.name === hookObject.className,
  )

  if (!schema) return

  await Promise.all(
    Object.keys(newData).map(async (keyName) => {
      const file = newData[keyName].file as File
      const url = newData[keyName].url as string

      if (url) {
        hookObject.upsertNewData(keyName, { url, isPresignedUrl: false })
        return
      }

      if (schema.fields[keyName].type !== 'File' || !(file instanceof File))
        return

      // We upload the file and set the name of the file in the newData
      await hookObject.context.wabe.controllers.file?.uploadFile(file)

      hookObject.upsertNewData(keyName, {
        name: file.name,
        isPresignedUrl: true,
      })
    }),
  )
}

export const defaultBeforeCreateUpload = (hookObject: HookObject<any, any>) =>
  handleFile(hookObject)

export const defaultBeforeUpdateUpload = (hookObject: HookObject<any, any>) =>
  handleFile(hookObject)
