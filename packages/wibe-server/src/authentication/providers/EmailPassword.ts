import { WibeApp } from '../../server'
import { AuthenticationEventsOptions, ProviderInterface } from '../interface'

export class EmailPassword implements ProviderInterface {
	async onSignIn({ context, input }: AuthenticationEventsOptions) {
		// TODO : Use first here but need to refactor in graphql and mongoadapter to have first and not limit
		const users = await WibeApp.databaseController.getObjects({
			className: '_User',
			where: {
				authentication: {
					// @ts-expect-error
					emailPassword: {
						email: { equalTo: input.email },
					},
				},
			},
		})

		if (users.length === 0)
			throw new Error('Invalid authentication credentials')

		const user = users[0]

		const userDatabasePassword =
			user.authentication?.emailPassword?.password

		if (!userDatabasePassword)
			throw new Error('Invalid authentication credentials')

		const isPasswordEquals = await Bun.password.verify(
			input.password,
			userDatabasePassword,
			'argon2id',
		)

		if (
			!isPasswordEquals ||
			input.email !== user.authentication?.emailPassword?.email
		)
			throw new Error('Invalid authentication credentials')

		const fifteenMinutes = new Date(Date.now() + 1000 * 60 * 15)
		const thirtyDays = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30)

		const accessToken = await context.jwt.sign({
			userId: user.id,
			iat: Date.now(),
			exp: fifteenMinutes.getTime(),
		})

		const refreshToken = await context.jwt.sign({
			userId: user.id,
			iat: Date.now(),
			exp: thirtyDays.getTime(),
		})

		// context.cookie.access_token.set({
		// 	value: accessToken,
		// 	httpOnly: true,
		// 	path: '/',
		// 	expires: fifteenMinutes,
		// 	// TODO : Check for implements csrf token for sub-domain protection
		// 	sameSite: 'strict',
		// 	secure: Bun.env.NODE_ENV === 'production',
		// })

		// context.cookie.refresh_token.set({
		// 	value: refreshToken,
		// 	httpOnly: true,
		// 	path: '/',
		// 	expires: thirtyDays,
		// 	sameSite: 'strict',
		// 	secure: Bun.env.NODE_ENV === 'production',
		// })

		return {
			user,
			dataToStore: {
				accessToken,
				refreshToken,
				password: userDatabasePassword,
				email: input.email,
			},
		}
	}

	async onSignUp({ input, context }: AuthenticationEventsOptions) {
		// try {
		// context.cookie.tata.set({
		// 	value: 'tata',
		// 	httpOnly: true,
		// 	path: '/',
		// })
		// } catch (e) {
		// 	console.error(e)
		// }

		const user = await WibeApp.databaseController.createObject({
			className: '_User',
			data: {
				authentication: {
					emailPassword: {
						...input,
					},
				},
			},
			context,
		})

		const fifteenMinutes = new Date(Date.now() + 15 * 60 * 1000)
		const thirtyDays = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)

		const accessToken = await context.jwt.sign({
			userId: user.id,
			iat: Date.now(),
			exp: fifteenMinutes.getTime(),
		})

		const refreshToken = await context.jwt.sign({
			userId: user.id,
			iat: Date.now(),
			exp: thirtyDays.getTime(),
		})

		const hashedPassword = await Bun.password.hash(
			input.password,
			'argon2id',
		)

		// context.cookie.access_token.set({
		// 	value: accessToken,
		// 	httpOnly: true,
		// 	path: '/',
		// 	expires: fifteenMinutes,
		// 	// TODO : Check for implements csrf token for sub-domain protection
		// 	sameSite: 'strict',
		// 	secure: Bun.env.NODE_ENV === 'production',
		// })

		// context.cookie.refresh_token.set({
		// 	value: refreshToken,
		// 	httpOnly: true,
		// 	path: '/',
		// 	expires: thirtyDays,
		// 	sameSite: 'strict',
		// 	secure: Bun.env.NODE_ENV === 'production',
		// })

		return {
			user,
			dataToStore: {
				accessToken,
				refreshToken,
				password: hashedPassword,
				email: input.email,
			},
		}
	}
}
