const tata =
  '$argon2id$v=19$m=65536,t=2,p=1$ta0LmQzammQDSlQbkC9Oug$E+5f7J1HrSmIMQ/9EI2IexFzSPTAT4iHQF91ErtlXgl5OZQWN9iHZE9NFjeMHGemBlrhcezFzUK0xt83OJw5yw'

console.log(await Bun.password.hash('monmotdepasse', { algorithm: 'argon2id' }))
console.log(await Bun.password.verify('monmotderpasse', tata))
