import {
  describe,
  expect,
  it,
  spyOn,
  beforeAll,
  afterAll,
  afterEach,
} from 'bun:test'
import { EmailOTP } from './EmailOTP'
import type { DevWabeTypes } from '../../utils/helper'
import { setupTests, closeTests } from '../../utils/testHelper'
import { EmailDevAdapter, type Wabe } from '../..'
import * as sendOtpCodeTemplate from '../../email/templates/sendOtpCode'
import { OTP } from '../OTP'

describe('EmailOTPProvider', () => {
  const spyEmailSend = spyOn(EmailDevAdapter.prototype, 'send')
  const spySendOtpCodeTemplate = spyOn(
    sendOtpCodeTemplate,
    'sendOtpCodeTemplate',
  )

  let wabe: Wabe<DevWabeTypes>

  beforeAll(async () => {
    const setup = await setupTests()
    wabe = setup.wabe
  })

  afterAll(async () => {
    await closeTests(wabe)
  })

  afterEach(async () => {
    spyEmailSend.mockClear()
    spySendOtpCodeTemplate.mockClear()

    await wabe.controllers.database.clearDatabase()
  })

  it("should send an OTP code to the user's email", async () => {
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
        email: true,
      },
    })

    if (!createdUser) throw new Error('User not created')

    const emailOTP = new EmailOTP()

    await emailOTP.onSendChallenge({
      context: {
        wabe,
        isRoot: false,
      },
      user: createdUser,
    })

    expect(spyEmailSend).toHaveBeenCalledTimes(1)
    expect(spyEmailSend).toHaveBeenCalledWith(
      expect.objectContaining({
        from: 'main.email@wabe.com',
        to: ['email@test.fr'],
        subject: 'Your OTP code',
      }),
    )

    const otp = spySendOtpCodeTemplate.mock.calls[0][0]

    expect(spySendOtpCodeTemplate).toHaveBeenCalledTimes(1)
    expect(otp.length).toBe(6)
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

    const otp = new OTP(wabe.config.rootKey).generate(createdUser.id)

    const emailOTP = new EmailOTP()

    expect(
      await emailOTP.onVerifyChallenge({
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
    const emailOTP = new EmailOTP()

    expect(
      await emailOTP.onVerifyChallenge({
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
