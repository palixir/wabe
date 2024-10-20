import { authenticator } from 'otplib'
import type { Wabe } from '.'
import type { DevWabeTypes } from '../utils/helper'

export const initializeInternalConfig = async (wabe: Wabe<DevWabeTypes>) => {
  const internalConfig = await wabe.controllers.database.getObjects({
    className: '_InternalConfig',
    fields: ['configKey', 'configValue'],
    context: {
      isRoot: true,
      wabe,
    },
    where: {
      configKey: {
        equalTo: 'otpSecret',
      },
    },
    first: 1,
  })

  if (internalConfig.length > 0) {
    wabe.config.internalConfig.otpSecret = internalConfig[0].configValue

    return
  }

  const secret = authenticator.generateSecret()

  await wabe.controllers.database.createObject({
    className: '_InternalConfig',
    context: {
      isRoot: true,
      wabe,
    },
    data: {
      configKey: 'otpSecret',
      configValue: secret,
      description: 'OTP secret',
    },

    fields: [],
  })

  wabe.config.internalConfig.otpSecret = secret
}
