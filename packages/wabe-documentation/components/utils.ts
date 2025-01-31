import { normalizeImagePath } from 'rspress/runtime'

export const computePublicPath = (path: string) => {
  return normalizeImagePath(path)
}
