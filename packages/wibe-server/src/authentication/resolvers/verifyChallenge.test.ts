import {
	describe,
	expect,
	it,
	beforeAll,
	mock,
	beforeEach,
	spyOn,
} from 'bun:test'
import { verifyChallengeResolver } from './verifyChallenge'
import type { Context } from '../../graphql/interface'
import { WibeApp } from '../../server'
import { Session } from '../Session'

const context: Context = {
	sessionId: 'sessionId',
	user: {
		id: 'userId',
	},
}

describe('verifyChallenge', () => {
	const mockOnVerifyChallenge = mock(() => Promise.resolve(true))

	beforeAll(() => {
		// @ts-expect-error
		WibeApp.config = {
			authentication: {
				customAuthenticationMethods: [
					{
						name: 'fakeOtp',
						input: {
							code: {
								type: 'String',
								required: true,
							},
						},
						provider: {
							onVerifyChallenge: mockOnVerifyChallenge,
							onSendChallenge: () => Promise.resolve(),
						},
					},
				],
			},
		}
	})

	beforeEach(() => {
		mockOnVerifyChallenge.mockClear()
	})

	it('should throw an error if no one factor is provided', async () => {
		expect(
			verifyChallengeResolver(
				undefined,
				{
					input: {},
				},
				context,
			),
		).rejects.toThrow('One factor is required')
	})

	it('should throw an error if more than one factor is provided', async () => {
		expect(
			verifyChallengeResolver(
				undefined,
				{
					input: {
						factor: {
							// @ts-expect-error
							factor1: {},
							factor2: {},
						},
					},
				},
				context,
			),
		).rejects.toThrow('Only one factor is allowed')
	})

	it('should throw an error if the onVerifyChallenge failed', async () => {
		mockOnVerifyChallenge.mockResolvedValue(false as never)

		expect(
			verifyChallengeResolver(
				undefined,
				{
					input: {
						factor: {
							// @ts-expect-error
							fakeOtp: {
								code: '123456',
							},
						},
					},
				},
				context,
			),
		).rejects.toThrow('Invalid challenge')
	})

	it('should return true if the verifyChallenge is correct', async () => {
		const spyCreateSession = spyOn(
			Session.prototype,
			'create',
		).mockResolvedValue('session' as never)

		mockOnVerifyChallenge.mockResolvedValue(true as never)

		expect(
			await verifyChallengeResolver(
				undefined,
				{
					input: {
						factor: {
							// @ts-expect-error
							fakeOtp: {
								code: '123456',
							},
						},
					},
				},
				context,
			),
		).toBe(true)

		expect(mockOnVerifyChallenge).toHaveBeenCalledTimes(1)
		expect(mockOnVerifyChallenge).toHaveBeenCalledWith({ code: '123456' })

		expect(spyCreateSession).toHaveBeenCalledTimes(1)
		expect(spyCreateSession).toHaveBeenCalledWith('userId', context)

		spyCreateSession.mockRestore()
	})
})
