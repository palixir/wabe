import { describe, expect, it } from 'bun:test'
import {
	encryptDeterministicToken,
	decryptDeterministicToken,
	hashArgon2,
	verifyArgon2,
	isArgon2Hash,
} from './crypto'

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

describe('Argon2 hash and verify', () => {
	it('should hash and verify a password successfully', async () => {
		const password = 'securePassword123!'
		const hash = await hashArgon2(password)

		expect(hash).toBeString()
		expect(isArgon2Hash(hash)).toBe(true)

		const isValid = await verifyArgon2(password, hash)
		expect(isValid).toBe(true)
	})

	it('should reject wrong password', async () => {
		const password = 'correctPassword'
		const hash = await hashArgon2(password)

		const isValid = await verifyArgon2('wrongPassword', hash)
		expect(isValid).toBe(false)
	})

	it('should produce different hashes for the same password (random nonce)', async () => {
		const password = 'samePassword'
		const hash1 = await hashArgon2(password)
		const hash2 = await hashArgon2(password)

		expect(hash1).not.toBe(hash2)

		expect(await verifyArgon2(password, hash1)).toBe(true)
		expect(await verifyArgon2(password, hash2)).toBe(true)
	})

	it('should identify argon2 hashes correctly', () => {
		expect(isArgon2Hash('$argon2id$v=19$m=65536,t=2,p=1$abc$def')).toBe(true)
		expect(isArgon2Hash('plaintext')).toBe(false)
		expect(isArgon2Hash('$bcrypt$blah')).toBe(false)
	})
})
