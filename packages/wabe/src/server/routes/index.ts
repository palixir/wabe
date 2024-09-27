import type { WobeHandler } from 'wobe'
import type { ProviderEnum } from '../../authentication/interface'
import { authHandler, oauthHandlerCallback } from './authHandler'
import type { WobeCustomContext } from '..'
import type {
  OnPaymentFailedOptions,
  OnPaymentSucceedOptions,
} from '../../payment/interface'
import { linkPayment } from '../../payment/linkPayment'

export interface WabeRoute {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE'
  path: string
  handler: WobeHandler<WobeCustomContext<any>>
}

export const defaultRoutes = (): WabeRoute[] => [
  {
    method: 'GET',
    path: '/auth/oauth',
    handler: async (context) => {
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
    handler: async (context) => {
      return oauthHandlerCallback(context, context.wabe)
    },
  },
  {
    method: 'POST',
    path: '/webhooks/payment',
    handler: async (context) => {
      const body = await context.request.json()

      switch (body.type) {
        case 'payment_intent.succeeded': {
          const res =
            await context.wabe.wabe.controllers.payment?.getCustomerById({
              id: body.data.object.customer?.id || '',
            })

          const customerEmail = res?.email || ''

          const extractedBody: OnPaymentSucceedOptions = {
            created: body.created,
            currency: body.data.object.currency,
            amount: body.data.object.amount / 100,
            billingDetails: body.data.object.shipping,
            paymentMethodTypes: body.data.object.payment_method_types,
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
            created: body.created,
            amount: body.data.object.amount / 100,
            messageError: body.data.object.last_payment_error?.message,
            paymentMethodTypes: body.data.object.payment_method_types,
          }

          await context.wabe.wabe.config.payment?.onPaymentFailed?.(
            extractedBody,
          )
          break
        }
        default:
          break
      }

      console.log('CONTEXT', context.res)

      return context.res.sendJson({ received: true })
    },
  },
]
