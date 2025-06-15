import type { ClassInterface } from '../schema'
import type { WabeTypes, WabeConfig } from '../server'

export const toBase32 = (stringToEncode: string): string => {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
  let bits = 0
  let value = 0
  let output = ''

  for (let i = 0; i < stringToEncode.length; i++) {
    // @ts-expect-error
    value = (value << 8) | stringToEncode[i]
    bits += 8

    while (bits >= 5) {
      output += alphabet[(value >>> (bits - 5)) & 31]
      bits -= 5
    }
  }

  if (bits > 0) {
    output += alphabet[(value << (5 - bits)) & 31]
  }

  return output
}

export const getNewObjectAfterUpdateNestedProperty = (
  obj: any,
  path: string,
  value: any,
) => {
  const keys = path.split('.')
  let current = { ...obj }

  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i]

    if (!key) continue

    if (current[key] === undefined) {
      current[key] = {}
    }
    current = current[key]
  }

  // @ts-expect-error
  current[keys[keys.length - 1]] = value
  return obj
}

export const getNestedProperty = (obj: any, path: string) => {
  return path.split('.').reduce((acc, part) => acc?.[part], obj)
}

export const isArgon2Hash = (value: string): boolean =>
  typeof value === 'string' && value.startsWith('$argon2')

export const firstLetterInUpperCase = (str: string) => {
  const indexOfFirstLetter = str.search(/[a-z]/i)

  return (
    str.slice(0, indexOfFirstLetter) +
    str[indexOfFirstLetter]?.toUpperCase() +
    str.slice(indexOfFirstLetter + 1)
  )
}

export const firstLetterInLowerCase = (str: string) => {
  const indexOfFirstLetter = str.search(/[a-z]/i)

  return (
    str.slice(0, indexOfFirstLetter) +
    str[indexOfFirstLetter]?.toLowerCase() +
    str.slice(indexOfFirstLetter + 1)
  )
}

export const getClassFromClassName = <T extends WabeTypes>(
  className: string,
  config: WabeConfig<any>,
): ClassInterface<T> => {
  const classInSchema = config.schema?.classes?.find(
    (schemaClass) => schemaClass.name === className,
  )

  if (!classInSchema) throw new Error('Class not found in schema')

  return classInSchema
}

// TODO: Put this in wobe
export const getCookieInRequestHeaders = (
  cookieName: string,
  headers: Headers,
) => {
  const cookies = headers.get('Cookie')

  if (!cookies) return

  const cookie = cookies.split(';').find((c) => c.includes(cookieName))

  if (!cookie) return

  return cookie.split('=')[1]
}

/**
 * This apply the following transformations on string:
 * - lowercase
 * - normalize with NFD
 * - remove diacritics and accents characters
 * - replace matching abbreviation with long version (if disableAbbreviations is not set)
 * - replace 2 or more spaces by one
 * - replace all non alpha characters by a space
 * - trim
 */
export const tokenize = (value: string) => {
  const tmpValue = value
    .toLowerCase()
    .normalize('NFD')
    // biome-ignore lint/suspicious/noMisleadingCharacterClass:
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s\s+/g, ' ')

  return (
    tmpValue
      // Replace all non alpha
      .replace(/[\W_]+/g, ' ')
      .trim()
  )
}
