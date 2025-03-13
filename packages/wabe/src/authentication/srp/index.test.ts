import { afterAll, beforeAll, describe, it, expect } from 'bun:test'
import { createSRPClient } from 'js-srp6a'
import type { Wabe } from '../../server'
import {
  type DevWabeTypes,
  setupTests,
  closeTests,
  getAnonymousClient,
} from '../../utils/helper'
import { gql } from 'graphql-request'

describe('EmailPasswordSRP', () => {
  let wabe: Wabe<DevWabeTypes>

  beforeAll(async () => {
    const setup = await setupTests()
    wabe = setup.wabe
  })

  afterAll(async () => {
    await closeTests(wabe)
  })

  it('should authenticate an user with SRP', async () => {
    const anonymousClient = getAnonymousClient(wabe.config.port)
    const email = 'test@gmail.com'
    const password = 'password'

    const client = createSRPClient('SHA-256', 3072)

    // Sign up
    const salt = client.generateSalt()
    const privateKey = await client.deriveSafePrivateKey(salt, password)
    const verifier = client.deriveVerifier(privateKey)

    await anonymousClient.request<any>(
      gql`
        mutation signUpWithSRP($input: SignUpWithSRPInput!) {
          signUpWithSRP(input: $input)
        }
      `,
      {
        input: {
          email,
          salt,
          verifier,
        },
      },
    )

    // Sign in
    const clientEphemeral = client.generateEphemeral()

    const { signInWithSRP } = await anonymousClient.request<any>(
      gql`
      mutation signInWithSRP($input: SignInWithSRPInput!) {
        signInWithSRP(input: $input) {
          salt
          serverPublic
        }
      }
    `,
      {
        input: {
          email,
          clientPublic: clientEphemeral.public,
        },
      },
    )

    const clientSession = await client.deriveSession(
      clientEphemeral.secret,
      signInWithSRP.serverPublic,
      salt,
      '', // Because we don't hash the username
      privateKey,
    )

    const { processSRPChallenge } = await anonymousClient.request<any>(
      gql`
        mutation processSRPChallenge($input: ProcessSRPChallengeInput!) {
          processSRPChallenge(input: $input) {
            serverSessionProof
          }
        }
      `,
      {
        input: {
          email,
          clientPublic: clientEphemeral.public,
          clientSessionProof: clientSession.proof,
        },
      },
    )

    expect(
      client.verifySession(
        clientEphemeral.public,
        clientSession,
        processSRPChallenge.serverSessionProof,
      ),
    ).resolves.toBeUndefined()
  })
})
