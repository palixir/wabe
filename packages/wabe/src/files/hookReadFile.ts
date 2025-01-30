import type { HookObject } from '../hooks/HookObject'

const getFile = async (hookObject: HookObject<any, any>) => {
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
        const fileName = hookObject.object?.[fieldName]?.name as string

        if (!fileName) return

        const fileUrl =
          await hookObject.context.wabe.config.file?.adapter.readFile(fileName)

        return hookObject.context.wabe.controllers.database.updateObject({
          className: hookObject.className,
          context: hookObject.context,
          id: hookObject.object?.id || '',
          data: {
            [fieldName]: {
              ...hookObject.object?.[fieldName],
              urlGeneratedAt: new Date(),
              url: fileUrl,
            },
          },
          fields: [],
        })
      }),
  )
}

export const defaultAfterReadFile = (hookObject: HookObject<any, any>) =>
  getFile(hookObject)
