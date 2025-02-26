import type { WabeTypes } from '..'
import type {
  CustomAuthenticationMethods,
  ProviderInterface,
} from './interface'
import { GitHub } from './providers'
import { Google } from './providers'
import { EmailOTP } from './providers/EmailOTP'
import { EmailPassword } from './providers/EmailPassword'
import { PhonePassword } from './providers/PhonePassword'

export const defaultAuthenticationMethods = <
  T extends WabeTypes,
>(): CustomAuthenticationMethods<T, ProviderInterface<T>>[] => [
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
    name: 'phonePassword',
    input: {
      phone: {
        type: 'Phone',
        required: true,
      },
      password: {
        type: 'String',
        required: true,
      },
    },
    dataToStore: {
      phone: {
        type: 'Phone',
        required: true,
      },
      password: {
        type: 'String',
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
        type: 'String',
        required: true,
      },
    },
    dataToStore: {
      email: {
        type: 'Email',
        required: true,
      },
      password: {
        type: 'String',
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
