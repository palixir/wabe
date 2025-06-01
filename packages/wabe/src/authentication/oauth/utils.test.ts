import { describe, expect, it } from 'bun:test'
import { base64URLencode, generateRandomValues } from './utils'

describe('Oauth utils', () => {
  it('should encode url with base64', () => {
    const content = 'test'

    // Keep Bun. here to be sure the compatibility between node and Bun implem
    const hasher = new Bun.CryptoHasher('sha256')
    hasher.update(new TextEncoder().encode(content))
    const resultWithPadding = hasher.digest('base64')

    const result = base64URLencode(content)

    expect(resultWithPadding).toBe(
      'n4bQgYhMfWWaL+qgxVrQFaO/TxsrC4Is0V1sFbDwCgg=',
    )
    expect(result).toBe('n4bQgYhMfWWaL-qgxVrQFaO_TxsrC4Is0V1sFbDwCgg')
  })

  // Real use case check with oauth simulator
  it('should encode correctly with base64', () => {
    const content = 'bIaNJCsNzrZE7QEzYjwbl0fa1CyzF49moM6Ua4H0d5cG-l7d'
    const result = base64URLencode(content)

    expect(result).toBe('1pdL2CLvBbNBnrfBZeNYlFzpedMhUTbgyhn0CnWVYoc')
  })

  it('should generate random values for code_verifier or state', () => {
    const randomValue = generateRandomValues()

    // Google recommends an entropy between 43 and 128 characters for the code_verifier
    expect(randomValue.length).toEqual(80)
  })
})
