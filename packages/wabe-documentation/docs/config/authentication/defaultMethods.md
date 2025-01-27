# Default authentication methods

Wabe provides some default authentication methods that you can use in your project.

Here is a list of the default authentication methods:

- Email password
- Phone password
- Google

```graphql
# Email password
mutation signUpWith {
  signUpWith(
    input: {authentication: {emailPassword: {email: "your.email@gmail.com", password: "password"}}}
  ) {
    id
    accessToken
		refreshToken
  }
}
# Phone password
mutation signUpWith {
  signUpWith(
    input: {authentication: {phonePassword: {phone: "+33601020304", password: "password"}}}
  ) {
    id
    accessToken
		refreshToken
  }
}

#Google
mutation signUpWith {
  signUpWith(
    input: {authentication: {google: {authorizationCode: "authorizationCode", codeVerifier: "codeVerifier"}}}
  ) {
    id
    accessToken
		refreshToken
  }
}
```
