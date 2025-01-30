import type { HookObject } from '../hooks/HookObject'

const handleFile = async (hookObject: HookObject<any, any>) => {
  const newData = hookObject.getNewData()

  const schema = hookObject.context.wabe.config.schema?.classes?.find(
    (currentClass) => currentClass.name === hookObject.className,
  )

  if (!schema) return

  await Promise.all(
    Object.keys(newData).map(async (keyName) => {
      if (
        schema.fields[keyName].type !== 'File' ||
        !(newData[keyName] instanceof File)
      )
        return

      // We upload the file and set the name of the file in the newData
      if (hookObject.context.wabe.config.file?.adapter) {
        await hookObject.context.wabe.config.file.adapter.uploadFile(
          newData[keyName],
        )

        hookObject.upsertNewData(keyName, { name: newData[keyName].name })
      }
    }),
  )
}

export const defaultBeforeCreateUpload = (hookObject: HookObject<any, any>) =>
  handleFile(hookObject)

export const defaultBeforeUpdateUpload = (hookObject: HookObject<any, any>) =>
  handleFile(hookObject)
