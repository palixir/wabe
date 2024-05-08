import jwt from 'jsonwebtoken'
import { WibeApp } from '../../server'
import { AuthenticationEventsOptions, ProviderInterface } from '../interface'

type EmailPasswordInterface = {
	password: string
	email: string
}

export class EmailPassword
	implements ProviderInterface<EmailPasswordInterface>
{
	async onSignIn({
		input,
	}: AuthenticationEventsOptions<EmailPasswordInterface>) {
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

		const accessToken = jwt.sign(
			{
				userId: user.id,
				iat: Date.now(),
				exp: fifteenMinutes.getTime(),
			},
			import.meta.env.JWT_SECRET as string,
		)

		const refreshToken = jwt.sign(
			{
				userId: user.id,
				iat: Date.now(),
				exp: thirtyDays.getTime(),
			},
			import.meta.env.JWT_SECRET as string,
		)

		return {
			user,
			dataToStore: {
				accessToken,
				refreshToken,
				expireAt: fifteenMinutes,
				password: userDatabasePassword,
				email: input.email,
			},
		}
	}

	async onSignUp({
		input,
		context,
	}: AuthenticationEventsOptions<EmailPasswordInterface>) {
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

		const accessToken = jwt.sign(
			{
				userId: user.id,
				iat: Date.now(),
				exp: fifteenMinutes.getTime(),
			},
			import.meta.env.JWT_SECRET as string,
		)

		const refreshToken = jwt.sign(
			{
				userId: user.id,
				iat: Date.now(),
				exp: thirtyDays.getTime(),
			},
			import.meta.env.JWT_SECRET as string,
		)

		const hashedPassword = await Bun.password.hash(
			input.password,
			'argon2id',
		)

		return {
			user,
			dataToStore: {
				accessToken,
				refreshToken,
				expireAt: fifteenMinutes,
				password: hashedPassword,
				email: input.email,
			},
		}
	}
}
