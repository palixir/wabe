import type { WabeTypes } from '..'
import type {
  CustomAuthenticationMethods,
  ProviderInterface,
} from './interface'
import { GitHub, QRCodeOTP } from './providers'
import { Google } from './providers'
import { EmailOTP } from './providers/EmailOTP'
import { EmailPassword } from './providers/EmailPassword'
import {
  EmailPasswordSRPChallenge,
  EmailPasswordSRP,
} from './providers/EmailPasswordSRP'
import { PhonePassword } from './providers/PhonePassword'

export const defaultAuthenticationMethods = <
  T extends WabeTypes,
>(): CustomAuthenticationMethods<T, ProviderInterface<T>>[] => [
  {
    name: 'emailPasswordSRPChallenge',
    input: {
      email: {
        type: 'Email',
        required: true,
      },
      clientPublic: {
        type: 'String',
        required: true,
      },
      clientSessionProof: {
        type: 'String',
        required: true,
      },
    },
    // @ts-expect-error
    provider: new EmailPasswordSRPChallenge(),
    isSecondaryFactor: true,
  },
  {
    name: 'emailPasswordSRP',
    input: {
      email: {
        type: 'Email',
        required: true,
      },
      clientPublic: {
        type: 'String',
      },
      salt: {
        type: 'String',
      },
      verifier: {
        type: 'String',
      },
    },
    dataToStore: {
      email: {
        type: 'Email',
        required: true,
      },
      salt: {
        type: 'String',
        required: true,
      },
      verifier: {
        type: 'String',
        required: true,
      },
      serverSecret: {
        type: 'String',
      },
    },
    // @ts-expect-error
    provider: new EmailPasswordSRP(),
  },
  {
    name: 'emailOTP',
    input: {
      email: {
        type: 'Email',
        required: true,
      },
      otp: {
        type: 'String',
        required: true,
      },
    },
    // @ts-expect-error
    provider: new EmailOTP(),
    isSecondaryFactor: true,
  },
  {
    name: 'qrCodeOTP',
    input: {
      email: {
        type: 'Email',
        required: true,
      },
      otp: {
        type: 'String',
        required: true,
      },
    },
    // @ts-expect-error
    provider: new QRCodeOTP(),
    isSecondaryFactor: true,
  },
  {
    name: 'phonePassword',
    input: {
      phone: {
        type: 'Phone',
        required: true,
      },
      password: {
        type: 'Hash',
        required: true,
      },
    },
    dataToStore: {
      phone: {
        type: 'Phone',
        required: true,
      },
      password: {
        type: 'Hash',
        required: true,
      },
    },
    // @ts-expect-error
    provider: new PhonePassword(),
  },
  {
    name: 'emailPassword',
    input: {
      email: {
        type: 'Email',
        required: true,
      },
      password: {
        type: 'Hash',
        required: true,
      },
    },
    dataToStore: {
      email: {
        type: 'Email',
        required: true,
      },
      password: {
        type: 'Hash',
        required: true,
      },
    },
    // @ts-expect-error
    provider: new EmailPassword(),
  },
  {
    name: 'google',
    input: {
      authorizationCode: {
        type: 'String',
        required: true,
      },
      codeVerifier: {
        type: 'String',
        required: true,
      },
    },
    dataToStore: {
      email: {
        type: 'Email',
        required: true,
      },
      verifiedEmail: {
        type: 'Boolean',
        required: true,
      },
    },
    // There is no signUp method for Google provider
    // @ts-expect-error
    provider: new Google(),
  },
  {
    name: 'github',
    input: {
      authorizationCode: {
        type: 'String',
        required: true,
      },
      codeVerifier: {
        type: 'String',
        required: true,
      },
    },
    dataToStore: {
      email: {
        type: 'Email',
        required: true,
      },
      avatarUrl: {
        type: 'String',
        required: true,
      },
      username: {
        type: 'String',
        required: true,
      },
    },
    // There is no signUp method for Google provider
    // @ts-expect-error
    provider: new GitHub(),
  },
]
