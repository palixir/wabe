import { WibeApp } from '../../server'
import { getGraphqlClient } from '../../utils/helper'
import { gql } from 'graphql-request'

export const signInWithProviderResolver = async (
	root: any,
	{
		email,
		verifiedEmail,
		provider,
		refreshToken,
		accessToken,
	}: {
		email: string
		verifiedEmail: boolean
		provider: string
		accessToken: string
		refreshToken: string
	},
) => {
	if (!verifiedEmail) throw new Error('Email not verified')

	const client = getGraphqlClient(WibeApp.config.port)

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
		{ where: { email: { equalTo: email } } },
	)

	if (objects.length === 1) {
		await client.request<any>(gql`
				mutation updateOne_User {
					updateOne_User(input:{id : "${objects[0].id}", fields: { email: "${email}", verifiedEmail: ${verifiedEmail}, refreshToken: "${refreshToken}", accessToken: "${accessToken}" } }) {
						id
					}
				}
			`)
	} else {
		await client.request<any>(gql`
				mutation createOne_User {
					createOne_User(input:{fields: { email: "${email}", verifiedEmail: ${verifiedEmail}, provider: "${provider}", refreshToken: "${refreshToken}", accessToken: "${accessToken}"}}) {
						id
					}
				}
			`)
	}

	return true
}