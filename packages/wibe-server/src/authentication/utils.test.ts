import { describe, expect, it, beforeAll, mock } from 'bun:test'
import { getAuthenticationMethod } from './utils'
import { WibeApp } from '../server'

describe('getAuthenticationMethod', () => {
	const mockOnSignIn = mock(() => Promise.resolve({}))
	const mockOnSignUp = mock(() => Promise.resolve({}))

	const mockOnSendChallenge = mock(() => Promise.resolve())
	const mockOnVerifyChallenge = mock(() => Promise.resolve(true))

	beforeAll(() => {
		WibeApp.config = {
			authentication: {
				customAuthenticationMethods: [
					{
						name: 'otp',
						input: {
							code: {
								type: 'String',
								required: true,
							},
						},
						provider: {
							name: 'otp',
							onSendChallenge: mockOnSendChallenge as any,
							onVerifyChallenge: mockOnVerifyChallenge as any,
						},
						isSecondaryFactor: true,
					},
					{
						name: 'emailPassword',
						input: {
							email: {
								type: 'Email',
								required: true,
							},
							password: {
								type: 'String',
								required: true,
							},
						},
						provider: {
							name: 'emailPassword',
							onSignUp: mockOnSignIn as any,
							onSignIn: mockOnSignUp as any,
						},
					},
				],
			},
		} as any
	})

	it('should throw an error if we provided two authentication methods', () => {
		expect(() =>
			getAuthenticationMethod([
				'emailPassword',
				'otherAuthenticationMethod',
			]),
		).toThrow('One authentication method is required at the time')
	})

	it('should throw an error if no authentication methods is provided', () => {
		expect(() => getAuthenticationMethod([])).toThrow(
			'One authentication method is required at the time',
		)
	})

	it('should throw an error if no one authentication method is found', () => {
		expect(() =>
			getAuthenticationMethod(['otherAuthenticationMethod']),
		).toThrow('No available custom authentication methods found')
	})

	it('should find a secondary factor method', () => {
		expect(getAuthenticationMethod(['otp'])).toEqual({
			name: 'otp',
			input: expect.any(Object),
			provider: expect.any(Object),
			isSecondaryFactor: true,
		})
	})

	it('should return the valid authentication method', () => {
		expect(getAuthenticationMethod(['emailPassword'])).toEqual({
			name: 'emailPassword',
			input: expect.any(Object),
			provider: expect.any(Object),
		})
	})
})
