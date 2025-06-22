import type { ClassInterface } from '../schema'
import type { WabeTypes, WabeConfig, WabeContext } from '../server'

export const contextWithoutGraphQLCall = (
  context: WabeContext<any>,
): WabeContext<any> => ({
  ...context,
  isGraphQLCall: false,
})

const RFC4648 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
const RFC4648_HEX = '0123456789ABCDEFGHIJKLMNOPQRSTUV'
const CROCKFORD = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'

type Base32Variant = 'RFC3548' | 'RFC4648' | 'RFC4648-HEX' | 'Crockford'

interface Base32Options {
  padding?: boolean
}

/**
 * Convert supported input types to Uint8Array.
 */
export const toUint8Array = (
  data: string | ArrayBuffer | Uint8Array | Buffer,
): Uint8Array => {
  if (data instanceof Uint8Array) return data

  if (typeof data === 'string') {
    const encoder = new TextEncoder()
    return encoder.encode(data)
  }

  if (data instanceof ArrayBuffer) return new Uint8Array(data)

  throw new TypeError('Unsupported data type for base32 encoding')
}

/**
 * Encode binary data to base32 using specified variant.
 * Base on https://github.com/LinusU/base32-encode/blob/master/index.js
 */
export const base32Encode = (
  data: string | ArrayBuffer | Uint8Array | Buffer,
  variant: Base32Variant,
  options: Base32Options = {},
): string => {
  let alphabet: string
  let defaultPadding: boolean

  switch (variant) {
    case 'RFC3548':
    case 'RFC4648':
      alphabet = RFC4648
      defaultPadding = true
      break
    case 'RFC4648-HEX':
      alphabet = RFC4648_HEX
      defaultPadding = true
      break
    case 'Crockford':
      alphabet = CROCKFORD
      defaultPadding = false
      break
    default:
      throw new Error(`Unknown base32 variant: ${variant}`)
  }

  const padding =
    options.padding !== undefined ? options.padding : defaultPadding
  const view = toUint8Array(data)

  let bits = 0
  let value = 0
  let output = ''

  for (let i = 0; i < view.length; i++) {
    // @ts-expect-error
    value = (value << 8) | view[i]
    bits += 8

    while (bits >= 5) {
      output += alphabet[(value >>> (bits - 5)) & 31]
      bits -= 5
    }
  }

  if (bits > 0) {
    output += alphabet[(value << (5 - bits)) & 31]
  }

  if (padding) {
    while (output.length % 8 !== 0) {
      output += '='
    }
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
