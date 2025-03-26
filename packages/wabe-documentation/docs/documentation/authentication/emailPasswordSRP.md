
# SRP Authentication

## Overview

The Secure Remote Password (SRP) protocol is a secure password-based authentication and key-exchange protocol.
SRP is resistant to dictionary attacks and does not require the storage of passwords in the database, enhancing security by
eliminating the risk of password exposure in case of a data breach. This method ensures that even if the server is compromised,
the user's password remains secure.

## SRP Authentication flow

### Sign Up

To sign up a user with SRP, follow these steps:

1. **Generate salt and verifier:**
   - Generate a salt using the SRP client.
   - Derive a private key from the salt and the user's password.
   - Create a verifier from the private key.

   **Client-side code example:**
   ```javascript
   import { createSRPClient } from 'js-srp6a'

   const client = createSRPClient('SHA-256', 3072);
   const salt = client.generateSalt();
   const privateKey = await client.deriveSafePrivateKey(salt, 'password');
   const verifier = client.deriveVerifier(privateKey);
   ```

2. **Send sign up request:**
   - Use the `signUpWith` mutation to send the email, salt, and verifier to the server.

   ```graphql
   mutation signUpWith($input: SignUpWithInput!) {
     signUpWith(input: $input) {
       accessToken
     }
   }
   ```

   **Input:**
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

### Sign In

To sign in a user with SRP, follow these steps:

1. **Generate ephemeral key:**
   - Generate an ephemeral key pair using the SRP client.

   **Client-side code example:**
   ```javascript
   const clientEphemeral = client.generateEphemeral();
   ```

2. **Send sign in request:**
   - Use the `signInWith` mutation to send the email and the client's public ephemeral key to the server.

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

   **Input:**
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

3. **Derive session:**
   - Derive the session using the client's ephemeral secret, the server's public key, the salt, and the private key.

   **Client-side code example:**
   ```javascript
   const clientSession = await client.deriveSession(
     clientEphemeral.secret,
     signInWith.srp.serverPublic,
     salt,
     '', // Because we don't hash the username
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
