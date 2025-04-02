import type { HookObject } from '../hooks/HookObject'

const getFile = async (hookObject: HookObject<any, any>) => {
  const schema = hookObject.context.wabe.config.schema?.classes?.find(
    (currentClass) => currentClass.name === hookObject.className,
  )

  if (!schema) return

  const urlCacheInSeconds =
    hookObject.context.wabe.config.file?.urlCacheInSeconds || 3600 * 24

  // After read we get the file URL and we update the field url with an URL.
  // For security purpose we recommend to use a presigned URL
  await Promise.all(
    Object.entries(schema.fields)
      .filter(([_, value]) => value.type === 'File')
      .map(async ([fieldName]) => {
        const fileInfo = hookObject.object?.[fieldName]

        if (!fileInfo) return

        const fileName = fileInfo.name as string

        if (!fileName && fileInfo.url) return fileInfo.url

        const fileUrlGeneratedAt = new Date(fileInfo.urlGeneratedAt)

        if (
          fileUrlGeneratedAt &&
          fileUrlGeneratedAt.getTime() + urlCacheInSeconds * 1000 >
            new Date().getTime()
        )
          return

        if (!hookObject.context.wabe.controllers.file)
          throw new Error('No file adapter found')

        const fileUrlFromBucket =
          await hookObject.context.wabe.controllers.file?.readFile(fileName)

        return hookObject.context.wabe.controllers.database.updateObject({
          className: hookObject.className,
          context: hookObject.context,
          id: hookObject.object?.id || '',
          data: {
            [fieldName]: {
              ...fileInfo,
              urlGeneratedAt: new Date(),
              url: fileUrlFromBucket || fileInfo.url,
            },
          },
          skipHooks: true,
        })
      }),
  )
}

export const defaultAfterReadFile = (hookObject: HookObject<any, any>) =>
  getFile(hookObject)
