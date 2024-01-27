import { WibeApp } from '../../server'
import { Provider, ValidateTokenOptions } from '../interface'

export class XProvider implements Provider {
    private clientId: string
    private clientSecret: string

    constructor(clientId: string, clientSecret: string) {
        this.clientId = clientId
        this.clientSecret = clientSecret
    }

    async validateTokenFromAuthorizationCode({ code }: ValidateTokenOptions) {
        const wibeConfig = WibeApp.config

        const res = await fetch('https://api.twitter.com/2/oauth2/token', {
            method: 'POST',
            body: JSON.stringify({
                code,
                client_id: this.clientId,
                client_secret: this.clientSecret,
                grant_type: 'authorization_code',
                redirect_uri: `http://127.0.0.1:${wibeConfig.port}/auth/provider/x`,
            }),
            headers: {
                Authorization: `Basic ${Buffer.from(
                    `${this.clientId}:${this.clientSecret}`,
                ).toString('base64')}`,
                'Content-Type': 'application/json',
            },
        })

        const { access_token, refresh_token } = await res.json()

        if (!refresh_token)
            throw new Error(
                'Refresh token not found, access_type must be offline',
            )

        if (!access_token) throw new Error('Invalid token')

        // TODO : For the moment X api v2 doesn't support email
        const user = await fetch(
            'https://api.twitter.com/2/users/me?user.fields=email&expansions=pinned_tweet_id',
            {
                headers: {
                    Authorization: `Bearer ${access_token}`,
                    'Content-Type': 'application/json',
                },
            },
        )

        const { email } = await user.json()

        // if (!verified_email) throw new Error('Email not verified')

        // const client = getGraphqlClient(wibeConfig.port)

        // await client.request<any>(gql`
        // 	mutation signInWithProvider {
        // 		signInWithProvider(
        // 			email: "${email}"
        // 			verifiedEmail: ${verified_email}
        // 			provider: ${AuthenticationProvider.X},
        // 			refreshToken: "${refresh_token}"
        // 			accessToken: "${access_token}"
        // 		)
        // 	}
        // `)

        return {
            accessToken: access_token,
            refreshToken: refresh_token,
        }
    }
}
