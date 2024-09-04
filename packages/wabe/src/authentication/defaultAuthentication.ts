import type { WabeTypes } from '..'
import type { CustomAuthenticationMethods } from './interface'
import { Google } from './providers'
import { EmailPassword } from './providers/EmailPassword'

export const defaultAuthenticationMethods = <
  T extends WabeTypes,
>(): CustomAuthenticationMethods<T>[] => [
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
      idToken: {
        type: 'String',
        required: true,
      },
    },
    provider: new Google(),
  },
]
