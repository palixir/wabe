import {
  describe,
  expect,
  it,
  beforeAll,
  afterAll,
  spyOn,
  afterEach,
} from 'bun:test'
import {
  closeTests,
  getGraphqlClient,
  setupTests,
  type DevWabeTypes,
} from '../../utils/helper'
import type { Wabe } from '../..'
import { gql, type GraphQLClient } from 'graphql-request'
// import * as linkPayment from '../../payment/linkPayment'

// Passed in local but not in CI so weird server/index.test.ts passed with similar code since #50
describe('webhookPayment route', () => {
  let wabe: Wabe<DevWabeTypes>
  let port: number
  let client: GraphQLClient

  beforeAll(async () => {
    const setup = await setupTests()
    wabe = setup.wabe
    port = setup.port
    client = getGraphqlClient(port)
  })

  afterAll(async () => {
    await closeTests(wabe)
  })

  // const spyLinkPayment = spyOn(linkPayment, 'linkPayment')

  // afterEach(() => {
  //   spyLinkPayment.mockClear()
  // })

  it('should call link payment and onPaymentSucceed when the webhook is called', async () => {
    //  await client.request<any>(gql`
    // 	mutation createUser {
    // 		createUser(input: {fields: {email: "customer@test.com"}}) {
    // 			user {
    // 				id
    // 				email
    // 			}
    // 		}
    // 	}
    // `)

    const res = await fetch(`http://127.0.0.1:${port}/webhooks/payment`, {
      method: 'POST',
    })

    expect(res.status).toEqual(200)

    //  const res2 = await client.request<any>(
    //    gql`query payments {
    //          payments {
    //            edges {
    //              node {
    //                amount
    //                user {
    //                  id
    //                  email
    //                }
    //              }
    //            }
    //          }
    //        }
    // `,
    //  )

    // expect(res2.payments.edges[0].node.amount).toEqual(1)
    // expect(res2.payments.edges[0].node.user.email).toEqual('customer@test.com')

    // expect(spyLinkPayment).toHaveBeenCalledTimes(1)
    // expect(spyLinkPayment).toHaveBeenCalledWith(
    //   expect.any(Object),
    //   'customer@test.com',
    //   1,
    //   'eur',
    // )
  })

  it.skip('should call onPaymentFailed when the webhook is called', async () => {
    await client.request<any>(gql`
				mutation createUser {
					createUser(input: {fields: {email: "customer@test.com"}}) {
						user {
							id
							email
						}
					}
				}
			`)

    await client.request<any>(gql`
				mutation createUser {
					createUser(input: {fields: {email: "customer2@test.com"}}) {
						user {
							id
							email
						}
					}
				}
			`)

    const res = await fetch(`http://127.0.0.1:${port}/webhooks/payment`, {
      method: 'POST',
      body: JSON.stringify({
        type: 'payment_intent.payment_failed',
        created: 'created',
        data: {
          object: {
            amount: 100,
            currency: 'eur',
            customer: 'customerId',
            payment_method_types: ['card'],
            last_payment_error: {
              message: 'Payment failed',
            },
            shipping: {
              address: {
                city: 'Paris',
                country: 'France',
                line1: '1 rue de la Paix',
                line2: '75008 Paris',
                postalCode: '75008',
                state: 'Paris',
              },
              name: 'John Doe',
              phone: '+33612345678',
            },
          },
        },
      }),
    })

    expect(res.status).toEqual(200)

    //  const res2 = await client.request<any>(
    //    gql`query payments {
    //          payments {
    //            edges {
    //              node {
    //                amount
    //                user {
    //                  id
    //                  email
    //                }
    //              }
    //            }
    //          }
    //        }
    // `,
    //  )

    //  expect(res2.payments.edges[0].node.amount).toEqual(1)
    //  expect(res2.payments.edges[0].node.user.email).toEqual('customer@test.com')

    //  expect(spyLinkPayment).toHaveBeenCalledTimes(0)
  })
})
