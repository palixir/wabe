import type { WobeHandler } from 'wobe'
import type { ProviderEnum } from '../../authentication/interface'
import { authHandler, oauthHandlerCallback } from './authHandler'
import type { Wabe, WobeCustomContext } from '..'
import type {
  OnPaymentFailedOptions,
  OnPaymentSucceedOptions,
} from '../../payment/interface'
import { linkPayment } from '../../payment/linkPayment'
import type { DevWabeTypes } from '../../utils/helper'

export interface WabeRoute {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE'
  path: string
  handler: WobeHandler<WobeCustomContext<any>>
}

const webhookRoute = (wabe: Wabe<DevWabeTypes>): Array<WabeRoute> => {
  const webhookUrl = wabe.config.payment?.webhook?.url || ''

  if (!webhookUrl) return []

  return [
    {
      method: 'POST',
      path: '/webhooks/payment',
      handler: async (context) => {
        const paymentController = context.wabe.wabe.controllers.payment

        if (!paymentController)
          return context.res.send('No payment controller', {
            status: 400,
          })

        const paymentEndpointSecret =
          context.wabe.wabe.config.payment?.webhook?.secret

        if (!paymentEndpointSecret)
          return context.res.send('Bad request', {
            status: 400,
          })

        const { payload, isValid } = await paymentController.validateWebhook({
          ctx: context,
          endpointSecret: paymentEndpointSecret,
        })

        if (!isValid)
          return context.res.send('Invalid webhook', {
            status: 400,
          })

        switch (payload.type) {
          case 'payment_intent.succeeded': {
            const res =
              await context.wabe.wabe.controllers.payment?.getCustomerById({
                id: payload.customerId || '',
              })

            const customerEmail = res?.email || ''

            const extractedBody: OnPaymentSucceedOptions = {
              createdAt: payload.createdAt || 0,
              currency: payload.currency || '',
              amount: payload.amount || 0,
              paymentMethodTypes: payload.paymentMethod || [],
              customerEmail,
            }

            if (extractedBody.customerEmail)
              await linkPayment(
                context.wabe,
                extractedBody.customerEmail,
                extractedBody.amount,
                extractedBody.currency,
              )

            await context.wabe.wabe.config.payment?.onPaymentSucceed?.(
              extractedBody,
            )
            break
          }
          case 'payment_intent.payment_failed': {
            const extractedBody: OnPaymentFailedOptions = {
              createdAt: payload.createdAt || 0,
              amount: payload.amount || 0,
              paymentMethodTypes: payload.paymentMethod || [],
            }

            await context.wabe.wabe.config.payment?.onPaymentFailed?.(
              extractedBody,
            )
            break
          }
          default:
            break
        }

        return context.res.sendJson({ received: true })
      },
    },
  ]
}

export const defaultRoutes = (wabe: Wabe<DevWabeTypes>): WabeRoute[] => {
  const routes: WabeRoute[] = [
    {
      method: 'GET',
      path: '/auth/oauth',
      handler: (context) => {
        const provider = context.query.provider

        if (!provider)
          throw new Error('Authentication failed, provider not found')

        // TODO: Maybe check if the value is in the enum
        return authHandler(context, context.wabe, provider as ProviderEnum)
      },
    },
    {
      method: 'GET',
      path: '/auth/oauth/callback',
      handler: (context) => oauthHandlerCallback(context, context.wabe),
    },
    ...webhookRoute(wabe),
  ]

  return routes
}
