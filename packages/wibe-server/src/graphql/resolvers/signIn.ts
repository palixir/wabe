import { gql } from 'graphql-request'
import { WibeApp } from '../../server'
import { getGraphqlClient } from '../../utils/helper'
import { Context } from '../interface'

export const signInResolver = async (
	root: any,
	{
		input: { email, password },
	}: {
		input: {
			email: string
			password: string
		}
	},
	context: Context,
) => {
	const client = getGraphqlClient(WibeApp.config.port)

	const hashedPassword = await Bun.password.hash(password, {
		algorithm: 'argon2id', // OWASP recommandation
		memoryCost: 20000, // OWASP recommands minimum 19MB
		timeCost: 2, // OWASP recommands minimum 2 iterations
	})

	const {
		findMany_User: { objects },
	} = await client.request<any>(
		gql`
      query findMany_User($where: _UserWhereInput!) {
        findMany_User(where: $where) {
          objects {
            id
          }
        }
      }
    `,
		{
			where: {
				AND: [
					{ email: { equalTo: email } },
					{ password: { equalTo: hashedPassword } },
				],
			},
		},
	)

	if (objects.lenght === 0) throw new Error('User not found')

	const wibeKey = WibeApp.config.wibeKey

	console.log(
		await context.jwt.sign({
			aud: 'aud',
			iss: 'iss',
			sub: 'sub',
			exp: 123,
			iat: 123,
			nbf: 123,
			jti: 'jti',
		}),
	)

	context.cookie.access_token.add({
		value: 'tata',
		httpOnly: true,
		path: '/',
		expires: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
	})

	return true
}
