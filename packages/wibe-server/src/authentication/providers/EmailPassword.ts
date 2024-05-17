import { WibeApp } from '../../server'
import { AuthenticationEventsOptions, ProviderInterface } from '../interface'

type EmailPasswordInterface = {
	password: string
	email: string
}

export class EmailPassword
	implements ProviderInterface<EmailPasswordInterface>
{
	name = 'emailPassword'
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

		return {
			user,
		}
	}

	async onSignUp({
		input,
	}: AuthenticationEventsOptions<EmailPasswordInterface>) {
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

		if (users.length > 0) throw new Error('User already exists')

		return {
			authenticationDataToSave: {
				email: input.email,
				password: await Bun.password.hash(input.password, 'argon2id'),
			},
		}
	}
}
