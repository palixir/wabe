import type { HookObject } from '../hooks/HookObject'

const getFile = async (hookObject: HookObject<any, any>) => {
  if (!hookObject.context.wabe.controllers.file) return

  const schema = hookObject.context.wabe.config.schema?.classes?.find(
    (currentClass) => currentClass.name === hookObject.className,
  )

  if (!schema) return

  // After read we get the file URL and we update the field url with an URL.
  // For security purpose we recommend to use a presigned URL
  await Promise.all(
    Object.entries(schema.fields)
      .filter(([_, value]) => value.type === 'File')
      .map(async ([fieldName]) => {
        const fileInfo = hookObject.object?.[fieldName]

        if (!fileInfo) return

        const fileName = fileInfo.name as string

        const fileUrl = fileName
          ? await hookObject.context.wabe.controllers.file?.readFile(fileName)
          : fileInfo.url

        return hookObject.context.wabe.controllers.database.updateObject({
          className: hookObject.className,
          context: hookObject.context,
          id: hookObject.object?.id || '',
          data: {
            [fieldName]: {
              ...fileInfo,
              urlGeneratedAt: new Date(),
              url: fileUrl,
            },
          },
          fields: ['*'],
          skipHooks: true,
        })
      }),
  )
}

export const defaultAfterReadFile = (hookObject: HookObject<any, any>) =>
  getFile(hookObject)
