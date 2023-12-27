import { describe, expect, it, mock, beforeAll, afterAll } from 'bun:test'
import { GoogleProvider } from './google'
import { WibeApp } from '../../server'
import { getGraphqlClient, setupTests } from '../../utils/helper'
import { GraphQLClient } from 'graphql-request'

const mockFetch = mock(() => {})
// @ts-expect-error
global.fetch = mockFetch

describe('Authentication: Google', () => {
	const googleProvider = new GoogleProvider('clientId', 'clientSecret')
	// @ts-expect-error
	WibeApp.config = { port: 3000 }

	let wibe: WibeApp
	let port: number
	let client: GraphQLClient

	beforeAll(async () => {
		const setup = await setupTests()
		wibe = setup.wibe
		port = setup.port
		client = getGraphqlClient(port)
	})

	afterAll(async () => {
		await wibe.close()
	})

	it('should validate token from authorization token', async () => {
		mockFetch.mockImplementationOnce(() => ({
			json: () => ({
				access_token: 'access_token',
				refresh_token: 'refresh_token',
				id_token: 'id_token',
			}),
		}))

		mockFetch.mockImplementationOnce(() => ({
			json: () => ({
				email: 'email@test.com',
				verified_email: true,
			}),
		}))

		const res =
			await googleProvider.validateTokenFromAuthorizationCode(
				'authorizationCode',
			)

		expect(res).toEqual({
			accessToken: 'access_token',
			refreshToken: 'refresh_token',
		})

		expect(mockFetch).toHaveBeenCalledTimes(2)
		expect(mockFetch).toHaveBeenCalledWith(
			'https://oauth2.googleapis.com/token',
			{
				method: 'POST',
				body: JSON.stringify({
					code: 'authorizationCode',
					client_id: 'clientId',
					client_secret: 'clientSecret',
					grant_type: 'authorization_code',
					redirect_uri: `http://localhost:${port}/auth/provider/google`,
				}),
				headers: {
					'Content-Type': 'application/json',
				},
			},
		)
		expect(mockFetch).toHaveBeenCalledWith(
			'https://www.googleapis.com/oauth2/v1/userinfo?alt=json&access_token=access_token',
			{
				headers: {
					Authorization: 'Bearer id_token',
				},
			},
		)
	})

	it('should throw an error if refresh token is not present', async () => {
		mockFetch.mockImplementationOnce(() => ({
			json: () => ({
				access_token: 'access_token',
				id_token: 'id_token',
			}),
		}))

		expect(
			googleProvider.validateTokenFromAuthorizationCode(
				'authorizationCode',
			),
		).rejects.toThrow(
			'Refresh token not found, access_type must be offline',
		)
	})

	it('should throw an error if access token or id_token is not present', async () => {
		mockFetch.mockImplementationOnce(() => ({
			json: () => ({
				refresh_token: 'refresh_token',
			}),
		}))

		expect(
			googleProvider.validateTokenFromAuthorizationCode(
				'authorizationCode',
			),
		).rejects.toThrow('Invalid token')
	})

	it('should throw an error if access token or id_token is not present', async () => {
		mockFetch.mockImplementationOnce(() => ({
			json: () => ({
				refresh_token: 'refresh_token',
			}),
		}))

		expect(
			googleProvider.validateTokenFromAuthorizationCode(
				'authorizationCode',
			),
		).rejects.toThrow('Invalid token')
	})
})
