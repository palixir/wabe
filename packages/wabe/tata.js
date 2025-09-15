const crypto = require('node:crypto')
const { promisify } = require('node:util')

const nonce = crypto.randomBytes(16)

const params = {
  nonce: nonce,
  parallelism: 1,
  tagLength: 64,
  memory: 65536,
  passes: 2,
  // Si tu utilises secret ou associatedData, il faudrait aussi les stocker
}

async function hashPassword(password) {
  const derivedKey = await promisify(crypto.argon2)('argon2id', {
    ...params,
    message: password,
  })

  return `$argon2id$v=19$m=${params.memory},t=${params.passes},p=${params.parallelism}$${nonce.toString('base64').replace(/=+$/, '')}$${derivedKey.toString('base64').replace(/=+$/, '')}`
}

async function verifyPassword(stored, passwordAttempt) {
  const [, algorithm, , paramString, nonceHex, storedHashHex] =
    stored.split('$')

  const kvPairs = paramString.split(',')
  const parsedParams = Object.fromEntries(
    kvPairs.map((pair) => {
      const [key, value] = pair.split('=')
      return [key, Number.parseInt(value, 10)]
    }),
  )

  const memory = parsedParams.m
  const passes = parsedParams.t
  const parallelism = parsedParams.p

  const newDerived = await promisify(crypto.argon2)(algorithm, {
    nonce: Buffer.from(nonceHex, 'base64'),
    parallelism,
    tagLength: 64,
    memory,
    passes,
    message: passwordAttempt,
  })

  // Comparaison constante pour éviter les timing-attacks
  const isMatch = crypto.timingSafeEqual(
    Buffer.from(newDerived),
    Buffer.from(storedHashHex, 'base64'),
  )

  return isMatch
}
// Exemple d'utilisation
;(async () => {
  const stored = await hashPassword('monmotdepasse')
  console.log('Stocké :', stored)

  const ok = await verifyPassword(stored, 'monmotdepasse')
  console.log('Mot de passe correct ? ', ok) // devrais être true

  const notOk = await verifyPassword(stored, 'autremdp')
  console.log('Mot de passe correct ? ', notOk) // false
})()
