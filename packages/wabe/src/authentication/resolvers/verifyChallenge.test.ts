import { describe, expect, it, beforeEach, mock, spyOn } from 'bun:test'
import { verifyChallengeResolver } from './verifyChallenge'
import type { WabeContext } from '../../server/interface'
import { Session } from '../Session'

describe('verifyChallenge', () => {
	const mockOnVerifyChallenge = mock(() => Promise.resolve(true))

	const context: WabeContext<any> = {
		sessionId: 'sessionId',
		user: {
			id: 'userId',
		} as any,
		wabe: {
			config: {
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
			},
		},
	} as any

	beforeEach(() => {
		mockOnVerifyChallenge.mockClear()
	})

	it('should throw an error if no one factor is provided', () => {
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

	it('should throw an error if more than one factor is provided', () => {
		expect(
			verifyChallengeResolver(
				undefined,
				{
					input: {
						secondFA: {
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

	it('should throw an error if the onVerifyChallenge failed', () => {
		mockOnVerifyChallenge.mockResolvedValue(false as never)

		expect(
			verifyChallengeResolver(
				undefined,
				{
					input: {
						secondFA: {
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

	it('should return userId if the verifyChallenge is correct', async () => {
		const spyCreateSession = spyOn(Session.prototype, 'create').mockResolvedValue({
			accessToken: 'accessToken',
			refreshToken: 'refreshToken',
			sessionId: 'sessionId',
			csrfToken: 'csrfToken',
		})

		mockOnVerifyChallenge.mockResolvedValue({ userId: 'userId' } as never)

		expect(
			await verifyChallengeResolver(
				undefined,
				{
					input: {
						secondFA: {
							// @ts-expect-error
							fakeOtp: {
								code: '123456',
							},
						},
					},
				},
				context,
			),
		).toEqual({
			accessToken: 'accessToken',
			srp: undefined,
		})

		expect(mockOnVerifyChallenge).toHaveBeenCalledTimes(1)
		expect(mockOnVerifyChallenge).toHaveBeenCalledWith({
			input: { code: '123456' },
			context: expect.any(Object),
		})

		expect(spyCreateSession).toHaveBeenCalledTimes(1)
		expect(spyCreateSession).toHaveBeenCalledWith('userId', context)

		spyCreateSession.mockRestore()
	})
})
