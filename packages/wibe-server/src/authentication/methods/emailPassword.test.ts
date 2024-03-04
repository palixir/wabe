// import { describe, expect, it, mock, spyOn } from 'bun:test'
// import { emailPasswordOnLogin, emailPasswordOnSignUp } from './emailPassword'

// describe('Email password', () => {
// 	it('should signUp with email password', async () => {
// 		const mockSign = mock(() => 'token')
// 		const spyBunPasswordHash = spyOn(
// 			Bun.password,
// 			'hash',
// 		).mockResolvedValue('$argon2id$hashedPassword')

// 		const res = await emailPasswordOnSignUp({
// 			context: {
// 				cookie: {},
// 				jwt: { sign: mockSign },
// 			},
// 			input: { identifier: 'email@test.fr', password: 'password' },
// 			user: { id: 'userId' },
// 		})

// 		expect(res).toEqual({
// 			accessToken: 'token',
// 			refreshToken: 'token',
// 			password: expect.any(String),
// 			identifier: 'email@test.fr',
// 		})

// 		expect(spyBunPasswordHash).toHaveBeenCalledTimes(1)
// 		expect(spyBunPasswordHash).toHaveBeenCalledWith('password', 'argon2id')
// 		expect(res.password).toContain('$argon2id$')

// 		expect(mockSign).toHaveBeenCalledTimes(2)
// 		expect(mockSign).toHaveBeenNthCalledWith(1, {
// 			userId: 'userId',
// 			iat: expect.any(Number),
// 			exp: expect.any(Number),
// 		})
// 		expect(mockSign).toHaveBeenNthCalledWith(2, {
// 			userId: 'userId',
// 			iat: expect.any(Number),
// 			exp: expect.any(Number),
// 		})

// 		spyBunPasswordHash.mockRestore()
// 	})

// 	it('should signIn with email password', async () => {
// 		const mockAddCookie = mock(() => {})
// 		const mockSign = mock(() => 'token')
// 		const spyBunPasswordVerify = spyOn(
// 			Bun.password,
// 			'verify',
// 		).mockResolvedValue(true)

// 		const res = await emailPasswordOnLogin({
// 			context: {
// 				cookie: {
// 					access_token: { add: mockAddCookie },
// 					refresh_token: { add: mockAddCookie },
// 				},
// 				jwt: { sign: mockSign },
// 			},
// 			input: { identifier: 'email@test.fr', password: 'password' },
// 			user: {
// 				id: 'userId',
// 				authentication: {
// 					emailPassword: {
// 						identifier: 'email@test.fr',
// 						password: 'hashedPassword',
// 					},
// 				},
// 			},
// 		})

// 		expect(res).toEqual({
// 			accessToken: 'token',
// 			refreshToken: 'token',
// 			password: 'hashedPassword',
// 			identifier: 'email@test.fr',
// 		})

// 		expect(spyBunPasswordVerify).toHaveBeenCalledTimes(1)
// 		expect(spyBunPasswordVerify).toHaveBeenCalledWith(
// 			'password',
// 			'hashedPassword',
// 			'argon2id',
// 		)

// 		expect(mockAddCookie).toHaveBeenCalledTimes(2)
// 		expect(mockAddCookie).toHaveBeenNthCalledWith(1, {
// 			value: 'token',
// 			httpOnly: true,
// 			path: '/',
// 			// Don't put the exact date to avoid flaky tests
// 			expires: expect.any(Date),
// 			sameSite: 'strict',
// 			secure: false,
// 		})
// 		expect(mockAddCookie).toHaveBeenNthCalledWith(2, {
// 			value: 'token',
// 			httpOnly: true,
// 			path: '/',
// 			// Don't put the exact date to avoid flaky tests
// 			expires: expect.any(Date),
// 			sameSite: 'strict',
// 			secure: false,
// 		})

// 		expect(mockSign).toHaveBeenCalledTimes(2)
// 		expect(mockSign).toHaveBeenNthCalledWith(1, {
// 			userId: 'userId',
// 			iat: expect.any(Number),
// 			exp: expect.any(Number),
// 		})
// 		expect(mockSign).toHaveBeenNthCalledWith(2, {
// 			userId: 'userId',
// 			iat: expect.any(Number),
// 			exp: expect.any(Number),
// 		})

// 		spyBunPasswordVerify.mockRestore()
// 	})

// 	it('should not signIn with email password if password is undefined', async () => {
// 		const mockAddCookie = mock(() => {})
// 		const mockSign = mock(() => 'token')
// 		const spyBunPasswordVerify = spyOn(
// 			Bun.password,
// 			'verify',
// 		).mockResolvedValue(false)

// 		expect(
// 			emailPasswordOnLogin({
// 				context: {
// 					cookie: {
// 						access_token: { add: mockAddCookie },
// 						refresh_token: { add: mockAddCookie },
// 					},
// 					jwt: { sign: mockSign },
// 				},
// 				input: { identifier: 'email@test.fr' },
// 				user: {
// 					id: 'userId',
// 					authentication: {
// 						emailPassword: {
// 							identifier: 'email@test.fr',
// 							password: 'invalidHashedPassword',
// 						},
// 					},
// 				},
// 			}),
// 		).rejects.toThrow('Invalid authentication credentials')

// 		spyBunPasswordVerify.mockRestore()
// 	})

// 	it('should not signIn with email password if identifier are different', async () => {
// 		const mockAddCookie = mock(() => {})
// 		const mockSign = mock(() => Promise.resolve('token'))
// 		const spyBunPasswordVerify = spyOn(
// 			Bun.password,
// 			'verify',
// 		).mockResolvedValue(true)

// 		expect(
// 			emailPasswordOnLogin({
// 				context: {
// 					cookie: {
// 						access_token: { add: mockAddCookie },
// 						refresh_token: { add: mockAddCookie },
// 					},
// 					jwt: { sign: mockSign },
// 				} as any,
// 				input: {
// 					identifier: 'invalidEmail@test.fr',
// 					password: 'password',
// 				},
// 				user: {
// 					id: 'userId',
// 					authentication: {
// 						emailPassword: {
// 							identifier: 'email@test.fr',
// 							password: 'invalidHashedPassword',
// 						},
// 					},
// 				},
// 			}),
// 		).rejects.toThrow('Invalid authentication credentials')

// 		expect(spyBunPasswordVerify).toHaveBeenCalledTimes(1)
// 	})
// })
