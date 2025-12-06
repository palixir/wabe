import { describe, expect, it } from 'bun:test'
import { encryptDeterministicToken, decryptDeterministicToken } from './crypto'

const key = Buffer.alloc(32, 1) // deterministic test key

describe('crypto deterministic token helpers', () => {
	it('should encrypt and decrypt deterministically with same key', () => {
		const token = 'my-token'
		const encrypted = encryptDeterministicToken(token, key)
		const decrypted = decryptDeterministicToken(encrypted, key)

		expect(decrypted).toBe(token)
	})

	it('should produce the same ciphertext for the same token/key', () => {
		const token = 'stable'
		const enc1 = encryptDeterministicToken(token, key)
		const enc2 = encryptDeterministicToken(token, key)

		expect(enc1).toBe(enc2)
	})

	it('should produce different ciphertexts for different tokens', () => {
		const enc1 = encryptDeterministicToken('a', key)
		const enc2 = encryptDeterministicToken('b', key)

		expect(enc1).not.toBe(enc2)
	})

	it('should return null when decrypting with the wrong key', () => {
		const token = 'secret'
		const encrypted = encryptDeterministicToken(token, key)
		const wrongKey = Buffer.alloc(32, 2)

		expect(decryptDeterministicToken(encrypted, wrongKey)).toBeNull()
	})

	it('should return null on malformed ciphertext', () => {
		expect(decryptDeterministicToken('bad:format', key)).toBeNull()
	})
})
