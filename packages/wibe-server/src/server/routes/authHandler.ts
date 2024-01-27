import { Context } from 'elysia'
import { WibeApp } from '..'
import { GoogleProvider } from '../../authentication/providers/google'
import { ProviderEnum } from '../../authentication/interface'
import { XProvider } from '../../authentication/providers/x'

const getProviderAdapter = ({
    provider,
    clientId,
    clientSecret,
}: { provider: ProviderEnum; clientId: string; clientSecret: string }) => {
    switch (provider) {
        case ProviderEnum.GOOGLE:
            return new GoogleProvider(clientId, clientSecret)
        case ProviderEnum.X:
            return new XProvider(clientId, clientSecret)
        default:
            throw new Error('Provider not found')
    }
}

export const authHandler = async (context: Context, provider: ProviderEnum) => {
    if (!WibeApp.config) throw new Error('Wibe config not found')

    const code = context.query.code

    const { authentication: authenticationConfig } = WibeApp.config

    if (!authenticationConfig)
        throw new Error('Authentication config not found')

    const clientId = authenticationConfig.providers[provider]?.clientId
    const clientSecret = authenticationConfig.providers[provider]?.clientSecret

    if (!code) throw new Error('Authentication : Authorization code not found')

    if (!clientId || !clientSecret)
        throw new Error('Authentication : Client id or secret not found')

    try {
        const providerAdapter = getProviderAdapter({
            provider,
            clientId,
            clientSecret,
        })

        const { accessToken, refreshToken } =
            await providerAdapter.validateTokenFromAuthorizationCode({
                code,
            })

        // Create cookie for access and refresh token
        context.cookie.accessToken.add({
            value: accessToken,
            httpOnly: true,
            path: '/',
            expires: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
        })

        context.cookie.refreshToken.add({
            value: refreshToken,
            httpOnly: true,
            path: '/',
            expires: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
        })

        context.set.redirect = authenticationConfig.successRedirectPath
    } catch (e) {
        console.error(e)
        context.set.redirect = authenticationConfig?.failureRedirectPath
    }
}
