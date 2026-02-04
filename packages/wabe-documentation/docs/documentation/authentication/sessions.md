# Sessions

## Configuration session parameters

Wabe gives you the ability to configure your `session` parameters. You can choose the duration of the generated `Access Token` and the duration of the generated `Refresh Token`. You can also decide whether to manage your sessions via `cookies` (so the frontend doesn't need to do anything) or to avoid storing Access Tokens in cookies (in which case the frontend must send the Access Token in the `Wabe-Access-Token` header with each request).

The `refreshToken` and the `accessToken` are stored in the `Session` table in the database. The `refreshToken` and the `accessToken` are automatically rotated after each request when `cookieSession` is used to limit the possibilities in case of theft.

```ts
import { Wabe } from "wabe";

const run = async () => {
  const wabe = new Wabe({
    // ... others config fields
    authentication: {
      session: {
        // 15 minutes in ms
        accessTokenExpiresInMs: 1000 * 60 * 15,
        // 1 day in ms
        refreshTokenExpiresInMs: 1000 * 60 * 60 * 24,
        cookieSession: true,
      },
    },
  });

  await wabe.start();
};

await run();
```

## CSRF Protection

Wabe implements CSRF (Cross-Site Request Forgery) protection for cookie-based sessions by default. When `cookieSession` is enabled, Wabe automatically generates and validates CSRF tokens to protect your application from CSRF attacks.

### How CSRF Tokens Work

1. **Token Generation**: When a session is created, Wabe generates a CSRF token that consists of:
   - A HMAC (Hash-based Message Authentication Code) generated using the session ID and a random value
   - A random value for additional security

2. **Token Format**: The CSRF token has the format `{hmac}.{randomValue}`

3. **Token Validation**: For each request, Wabe validates the CSRF token by:
   - Extracting the HMAC and random value from the token
   - Reconstructing the expected HMAC using the current session ID and the random value
   - Comparing the received HMAC with the expected HMAC using timing-safe comparison

### CSRF Token Usage

When using cookie-based sessions:

1. **Frontend Setup**: The frontend should read the CSRF token from the `csrfToken` cookie and include it in the `Wabe-Csrf-Token` header for each request.

2. **Backend Validation**: Wabe automatically validates the CSRF token on each request when `cookieSession` is enabled.

### Configuration Options

You can customize CSRF protection behavior:

```ts
import { Wabe } from "wabe";

const run = async () => {
  const wabe = new Wabe({
    // ... other configuration fields
    authentication: {
      session: {
        csrfSecret: "your-custom-csrf-secret", // Optional: Custom secret for CSRF token generation
        cookieSession: true,
      },
    },
    security: {
      disableCSRFProtection: false, // Set to true to disable CSRF protection (not recommended)
    },
  });

  await wabe.start();
};

await run();
```

### Disabling CSRF Protection

> ⚠️ **Warning**: Disabling CSRF protection is not recommended for production environments.

If you need to disable CSRF protection (for example, when using API clients that don't support CSRF tokens), you can do so:

```ts
import { Wabe } from "wabe";

const run = async () => {
  const wabe = new Wabe({
    // ... other configuration fields
    security: {
      disableCSRFProtection: true,
    },
  });

  await wabe.start();
};

await run();
```

When CSRF protection is disabled, you must ensure that your frontend properly handles the CSRF token if you're using cookie-based sessions.

## Session Management Best Practices

1. **Use HTTPS**: Always use HTTPS to prevent session hijacking and man-in-the-middle attacks.

2. **Keep Default Token Expiration**: The default 15-minute access token expiration provides a good balance between security and user experience.

3. **Rotate Secrets**: Regularly rotate your JWT secrets and CSRF secrets in production.

4. **Monitor Sessions**: Implement logging and monitoring for session creation and usage patterns.

5. **Secure Cookies**: Ensure cookies are properly configured with `Secure`, `HttpOnly`, and `SameSite` attributes.