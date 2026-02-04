import { describe, expect, it, beforeAll, afterAll, afterEach } from 'bun:test'
import type { DevWabeTypes } from '../../utils/helper'
import { setupTests, closeTests } from '../../utils/testHelper'
import type { Wabe } from '../..'
import { OTP } from '../OTP'
import { QRCodeOTP } from './QRCodeOTP'

describe('QRCodeOTPProvider', () => {
	let wabe: Wabe<DevWabeTypes>

	beforeAll(async () => {
		const setup = await setupTests()
		wabe = setup.wabe
	})

	afterAll(async () => {
		await closeTests(wabe)
	})

	afterEach(async () => {
		await wabe.controllers.database.clearDatabase()
	})

	it('should return the userId if the OTP code is valid', async () => {
		const createdUser = await wabe.controllers.database.createObject({
			className: 'User',
			context: {
				wabe,
				isRoot: true,
			},
			data: {
				email: 'email@test.fr',
			},
			select: {
				id: true,
			},
		})

		if (!createdUser) throw new Error('User not created')

		const otp = new OTP(wabe.config.rootKey).authenticatorGenerate(createdUser.id)

		const qrCodeOTP = new QRCodeOTP()

		expect(
			await qrCodeOTP.onVerifyChallenge({
				context: {
					wabe,
					isRoot: false,
				},
				input: {
					email: 'email@test.fr',
					otp,
				},
			}),
		).toEqual({
			userId: createdUser.id,
		})
	})

	it("should return null if the user doesn't exist", async () => {
		const qrCodeOTP = new QRCodeOTP()

		expect(
			await qrCodeOTP.onVerifyChallenge({
				context: {
					wabe,
					isRoot: false,
				},
				input: {
					email: 'email@test.fr',
					otp: '123456',
				},
			}),
		).toEqual(null)
	})
})
