
# SRP Authentication

## Overview

The Secure Remote Password (SRP) protocol is a cryptographically secure password-based authentication and key-exchange protocol. SRP provides several security advantages:

- **No password storage**: User passwords are never stored in the database
- **Resistance to dictionary attacks**: Even with compromised database, passwords remain secure
- **Mutual authentication**: Both client and server authenticate each other
- **Perfect forward secrecy**: Session keys are not compromised even if long-term keys are

SRP is particularly suitable for applications requiring high security standards where traditional password storage poses risks.

## SRP Authentication Flow

The SRP authentication process involves several steps that ensure secure credential exchange without transmitting passwords.

### Sign Up Process

1. **Client-side preparation:**
   - Generate cryptographic salt
   - Derive private key from salt and password
   - Create verifier from private key

   ```javascript
   import { createSRPClient } from 'js-srp6a'

   const client = createSRPClient('SHA-256', 3072);
   const salt = client.generateSalt();
   const privateKey = await client.deriveSafePrivateKey(salt, 'password');
   const verifier = client.deriveVerifier(privateKey);
   ```

2. **Server registration:**
   - Send email, salt, and verifier via `signUpWith` mutation
   - Server stores salt and verifier (never stores password)

   ```graphql
   mutation signUpWith($input: SignUpWithInput!) {
     signUpWith(input: $input) {
       accessToken
     }
   }
   ```

   **Variables:**
   ```json
   {
     "input": {
       "authentication": {
         "emailPasswordSRP": {
           "email": "test@gmail.com",
           "salt": "generated_salt",
           "verifier": "generated_verifier"
         }
       }
     }
   }
   ```

### Sign In Process

1. **Ephemeral key generation:**
   - Client generates temporary key pair for this session

   ```javascript
   const clientEphemeral = client.generateEphemeral();
   ```

2. **Initial authentication request:**
   - Client sends email and public ephemeral key
   - Server responds with salt and its public ephemeral key

   ```graphql
   mutation signInWith($input: SignInWithInput!) {
     signInWith(input: $input) {
       srp {
         salt
         serverPublic
       }
     }
   }
   ```

   **Variables:**
   ```json
   {
     "input": {
       "authentication": {
         "emailPasswordSRP": {
           "email": "test@gmail.com",
           "clientPublic": "client_ephemeral_public"
         }
       }
     }
   }
   ```

3. **Session derivation:**
   - Client derives session key using ephemeral secret, server public key, salt, and private key

   ```javascript
   const clientSession = await client.deriveSession(
     clientEphemeral.secret,
     signInWith.srp.serverPublic,
     salt,
     '', // Username not hashed in this implementation
     privateKey
   );
   ```

### Verify Challenge

To verify the challenge and complete the authentication process, follow these steps:

1. **Send verify challenge request:**
   - Use the `verifyChallenge` mutation to send the email, the client's public ephemeral key, and the client's session proof to the server.

   ```graphql
   mutation verifyChallenge($input: VerifyChallengeInput!) {
     verifyChallenge(input: $input) {
       srp {
         serverSessionProof
       }
     }
   }
   ```

   **Input:**
   ```json
   {
     "input": {
       "secondFA": {
         "emailPasswordSRPChallenge": {
           "email": "test@gmail.com",
           "clientPublic": "client_ephemeral_public",
           "clientSessionProof": "client_session_proof"
         }
       }
     }
   }
   ```

2. **Verify session:**
   - Verify the session using the client's public ephemeral key, the client's session, and the server's session proof.

   **Client-side code example:**
   ```javascript
   // If this function doesn't throw an error the connection is done !
   await client.verifySession(
     clientEphemeral.public,
     clientSession,
     verifyChallenge.srp.serverSessionProof
   );


   ```

By following these steps, you can securely authenticate users using the SRP protocol without storing passwords in your database.
