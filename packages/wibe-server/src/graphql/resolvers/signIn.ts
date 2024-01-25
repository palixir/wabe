import { gql } from 'graphql-request'
import { WibeApp } from '../../server'
import { getGraphqlClient } from '../../utils/helper'

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
) => {
	const client = getGraphqlClient(WibeApp.config.port)

	const hashedPassword = Bun.password.hash(password, {
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
}
