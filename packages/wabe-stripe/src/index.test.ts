import { describe, expect, it, mock, spyOn, beforeEach } from 'bun:test'
import { StripeAdapter } from '.'
import Stripe from 'stripe'
import { Currency, PaymentMode } from 'wabe'

const mockListCustomers = mock(() => {})
const mockCreateCustomer = mock(() => {})
const mockCreatePayment = mock(() => {})
const mockListSubscriptions = mock(() => {})
const mockCancelSubscription = mock(() => {})
const mockGetInvoices = mock(() => {})
const mockListTransactions = mock(() => {})
const mockInvoicesRetrieve = mock(() => {})
const mockSubscriptionsRetrieve = mock(() => {})
const mockChargesRetrieve = mock(() => {})
const mockCustomersRetrieve = mock(() => {})
const mockListCharges = mock(() => {})
const mockWebhookEndpointsCreate = mock(() => {})

spyOn(Stripe.prototype, 'customers').mockReturnValue({
  create: mockCreateCustomer,
  list: mockListCustomers,
  retrieve: mockCustomersRetrieve,
} as never)

spyOn(Stripe.prototype, 'checkout').mockReturnValue({
  sessions: {
    create: mockCreatePayment,
  },
} as never)

spyOn(Stripe.prototype, 'subscriptions').mockReturnValue({
  list: mockListSubscriptions,
  cancel: mockCancelSubscription,
  retrieve: mockSubscriptionsRetrieve,
} as never)

spyOn(Stripe.prototype, 'invoices').mockReturnValue({
  list: mockGetInvoices,
  retrieve: mockInvoicesRetrieve,
} as never)

spyOn(Stripe.prototype, 'balanceTransactions').mockReturnValue({
  list: mockListTransactions,
} as never)

spyOn(Stripe.prototype, 'charges').mockReturnValue({
  list: mockListCharges,
  retrieve: mockChargesRetrieve,
} as never)

spyOn(Stripe.prototype, 'webhookEndpoints').mockReturnValue({
  create: mockWebhookEndpointsCreate,
} as never)

describe('wabe-stripe', () => {
  beforeEach(() => {
    mockListCustomers.mockClear()
    mockCreateCustomer.mockClear()
    mockCreatePayment.mockClear()
    mockListSubscriptions.mockClear()
    mockCancelSubscription.mockClear()
    mockGetInvoices.mockClear()
    mockListTransactions.mockClear()
    mockInvoicesRetrieve.mockClear()
    mockSubscriptionsRetrieve.mockClear()
    mockChargesRetrieve.mockClear()
    mockCustomersRetrieve.mockClear()
    mockListCharges.mockClear()
    mockWebhookEndpointsCreate.mockClear()
  })

  it('should get a customer by id', async () => {
    const adapter = new StripeAdapter('API_KEY')

    mockCustomersRetrieve.mockResolvedValue({
      id: 'cus_123',
      email: 'test@wabe.dev',
    } as never)

    const customer = await adapter.getCustomerById({
      id: 'cus_123',
    })

    expect(mockCustomersRetrieve).toHaveBeenCalledTimes(1)
    expect(mockCustomersRetrieve).toHaveBeenCalledWith('cus_123')

    expect(customer).toEqual({
      email: 'test@wabe.dev',
    })
  })

  it('should init the webhooks', async () => {
    const adapter = new StripeAdapter('API_KEY')

    mockWebhookEndpointsCreate.mockResolvedValue({
      id: 'wh_123',
    } as never)

    await adapter.initWebhook({ webhookUrl: 'https://wabe.dev' })

    expect(mockWebhookEndpointsCreate).toHaveBeenCalledTimes(1)
    expect(mockWebhookEndpointsCreate).toHaveBeenCalledWith({
      url: 'https://wabe.dev',
      enabled_events: [
        'payment_intent.succeeded',
        'payment_intent.payment_failed',
      ],
    })
  })

  it('should get the hypothetical revenue', async () => {
    const adapter = new StripeAdapter('API_KEY')

    mockListSubscriptions.mockResolvedValueOnce({
      data: [
        {
          id: 'sub_123',
          items: {
            data: [
              {
                plan: {
                  amount: 100,
                },
              },
            ],
          },
        },
      ],
      has_more: true,
    } as never)

    mockListSubscriptions.mockResolvedValueOnce({
      data: [
        {
          id: 'sub_123',
          items: {
            data: [
              {
                plan: {
                  amount: 100,
                },
              },
            ],
          },
        },
      ],
      has_more: false,
    } as never)

    await adapter.getHypotheticalSubscriptionRevenue()

    expect(mockListSubscriptions).toHaveBeenCalledTimes(2)
    expect(mockListSubscriptions).toHaveBeenNthCalledWith(1, {
      status: 'active',
      limit: 100,
    })
    expect(mockListSubscriptions).toHaveBeenNthCalledWith(2, {
      status: 'active',
      limit: 100,
      starting_after: 'sub_123',
    })
  })

  it('should get all transactions with first to 50', async () => {
    const adapter = new StripeAdapter('API_KEY')

    mockListCharges.mockResolvedValue({
      data: [
        {
          id: 'txn_123',
          amount: 100,
          created: 1679481600,
          currency: Currency.EUR,
        },
        {
          id: 'txn_124',
          amount: 200,
          created: 1679481600,
          currency: Currency.EUR,
        },
        {
          id: 'txn_125',
          amount: 300,
          created: 1679481600,
          currency: Currency.EUR,
        },
      ],
      has_more: false,
    } as never)

    mockInvoicesRetrieve.mockResolvedValue({
      subscription: 'sub_123',
    } as never)

    mockSubscriptionsRetrieve.mockResolvedValue({
      items: {
        data: [
          {
            plan: {
              interval_count: 1,
              interval: 'month',
            },
          },
        ],
      },
    } as never)

    mockCustomersRetrieve.mockResolvedValue({
      email: 'test@wabe.dev',
    } as never)

    const res = await adapter.getAllTransactions({
      startRangeTimestamp: 1679481600,
      endRangeTimestamp: 1679481600,
      first: 50,
    })

    expect(mockListCharges).toHaveBeenCalledTimes(1)
    expect(mockListCharges).toHaveBeenCalledWith({
      limit: 50,
      created: {
        gte: 1679481600,
        lt: 1679481600,
      },
    })

    expect(res).toEqual([
      {
        customerEmail: 'test@wabe.dev',
        amount: 100,
        currency: Currency.EUR,
        created: 1679481600,
        isSubscription: true,
        reccuringInterval: 'month',
      },
      {
        customerEmail: 'test@wabe.dev',
        amount: 200,
        currency: Currency.EUR,
        created: 1679481600,
        isSubscription: true,
        reccuringInterval: 'month',
      },
      {
        customerEmail: 'test@wabe.dev',
        amount: 300,
        currency: Currency.EUR,
        created: 1679481600,
        isSubscription: true,
        reccuringInterval: 'month',
      },
    ])
  })

  it('should return isSubscription false if no subscription found', async () => {
    const adapter = new StripeAdapter('API_KEY')

    mockListCharges.mockResolvedValue({
      data: [
        {
          id: 'txn_123',
          amount: 100,
          created: 1679481600,
          currency: Currency.EUR,
        },
        {
          id: 'txn_124',
          amount: 200,
          created: 1679481600,
          currency: Currency.EUR,
        },
        {
          id: 'txn_125',
          amount: 300,
          created: 1679481600,
          currency: Currency.EUR,
        },
      ],
      has_more: false,
    } as never)

    mockInvoicesRetrieve.mockResolvedValue({
      subscription: undefined,
    } as never)

    mockSubscriptionsRetrieve.mockResolvedValue({
      items: {
        data: [
          {
            plan: {},
          },
        ],
      },
    } as never)

    mockCustomersRetrieve.mockResolvedValue({
      email: 'test@wabe.dev',
    } as never)

    const res = await adapter.getAllTransactions({
      startRangeTimestamp: 1679481600,
      endRangeTimestamp: 1679481600,
    })

    expect(mockListCharges).toHaveBeenCalledTimes(1)
    expect(mockListCharges).toHaveBeenCalledWith({
      limit: 100,
      created: {
        gte: 1679481600,
        lt: 1679481600,
      },
    })

    expect(res).toEqual([
      {
        customerEmail: 'test@wabe.dev',
        amount: 100,
        currency: Currency.EUR,
        created: 1679481600,
        isSubscription: false,
      },
      {
        customerEmail: 'test@wabe.dev',
        amount: 200,
        currency: Currency.EUR,
        created: 1679481600,
        isSubscription: false,
      },
      {
        customerEmail: 'test@wabe.dev',
        amount: 300,
        currency: Currency.EUR,
        created: 1679481600,
        isSubscription: false,
      },
    ])
  })

  it('should get the total gross revenue', async () => {
    const adapter = new StripeAdapter('API_KEY')

    mockListTransactions.mockResolvedValue({
      data: [
        {
          id: 'txn_123',
          amount: 100,
        },
        {
          id: 'txn_124',
          amount: 200,
        },
        {
          id: 'txn_125',
          amount: 300,
        },
      ],
      has_more: false,
    } as never)

    await adapter.getTotalRevenue({
      charge: 'gross',
    })

    expect(mockListTransactions).toHaveBeenCalledTimes(1)
    expect(mockListTransactions).toHaveBeenCalledWith({
      limit: 100,
      type: 'charge',
      created: {
        gte: undefined,
        lt: undefined,
      },
    })
  })

  it('should get the total net revenue', async () => {
    const adapter = new StripeAdapter('API_KEY')

    mockListTransactions.mockResolvedValue({
      data: [
        {
          id: 'txn_123',
          amount: 100,
        },
        {
          id: 'txn_124',
          amount: 200,
        },
        {
          id: 'txn_125',
          amount: 300,
        },
      ],
      has_more: false,
    } as never)

    await adapter.getTotalRevenue({
      charge: 'net',
      endRangeTimestamp: 1679481600,
      startRangeTimestamp: 1679481600,
    })

    expect(mockListTransactions).toHaveBeenCalledTimes(1)
    expect(mockListTransactions).toHaveBeenCalledWith({
      limit: 100,
      created: {
        gte: 1679481600,
        lt: 1679481600,
      },
    })
  })

  it('should create a customer', async () => {
    const adapter = new StripeAdapter('API_KEY')

    mockCreateCustomer.mockResolvedValue({
      id: 'cus_123',
      email: 'test@wabe.dev',
    } as never)

    await adapter.createCustomer({
      customerEmail: 'lucas.coratger@gmail.com',
      customerName: 'Lucas',
      address: {
        city: 'Paris',
        country: 'France',
        line1: '1 rue de la Paix',
        line2: 'Appartement 1',
        postalCode: '75001',
        state: 'Paris',
      },
      paymentMethod: 'card',
    })

    expect(mockCreateCustomer).toHaveBeenCalledTimes(1)
    expect(mockCreateCustomer).toHaveBeenCalledWith({
      email: 'lucas.coratger@gmail.com',
      address: {
        city: 'Paris',
        country: 'France',
        line1: '1 rue de la Paix',
        line2: 'Appartement 1',
        postal_code: '75001',
        state: 'Paris',
      },
      name: 'Lucas',
      phone: undefined,
      payment_method: 'card',
    })
  })

  it('should create a payment', async () => {
    const adapter = new StripeAdapter('API_KEY')

    mockListCustomers.mockResolvedValue({
      data: [
        {
          id: 'cus_123',
          email: 'test@wabe.dev',
        },
      ],
    } as never)

    mockCreatePayment.mockResolvedValue({
      url: 'https://test.com',
    } as never)

    await adapter.createPayment({
      customerEmail: 'lucas.coratger@gmail.com',
      currency: Currency.EUR,
      paymentMethod: ['card'],
      products: [
        {
          name: 'Product 1',
          unitAmount: 1000,
          quantity: 1,
        },
      ],
      paymentMode: PaymentMode.Subscription,
      successUrl: 'https://wabe.dev',
      cancelUrl: 'https://wabe.dev',
    })

    expect(mockListCustomers).toHaveBeenCalledTimes(1)
    expect(mockListCustomers).toHaveBeenCalledWith({
      email: 'lucas.coratger@gmail.com',
      limit: 1,
    })

    expect(mockCreatePayment).toHaveBeenCalledTimes(1)
    expect(mockCreatePayment).toHaveBeenCalledWith({
      customer: 'cus_123',
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: 'Product 1',
            },
            unit_amount: 1000,
            recurring: {
              interval: 'month',
            },
          },
          quantity: 1,
        },
      ],
      payment_method_types: ['card'],
      mode: 'subscription',
      success_url: 'https://wabe.dev',
      cancel_url: 'https://wabe.dev',
      automatic_tax: {
        enabled: false,
      },
    })
  })

  it('should throw an error if the session url is not returned by Stripewhen creating a payment', async () => {
    const adapter = new StripeAdapter('API_KEY')

    mockListCustomers.mockResolvedValue({
      data: [
        {
          id: 'cus_123',
          email: 'test@wabe.dev',
        },
      ],
    } as never)

    mockCreatePayment.mockResolvedValue({
      url: undefined,
    } as never)

    expect(
      adapter.createPayment({
        customerEmail: 'lucas.coratger@gmail.com',
        currency: Currency.EUR,
        paymentMethod: ['card'],
        products: [
          {
            name: 'Product 1',
            unitAmount: 1000,
            quantity: 1,
          },
        ],
        paymentMode: PaymentMode.Subscription,
        successUrl: 'https://wabe.dev',
        cancelUrl: 'https://wabe.dev',
      }),
    ).rejects.toThrow('Error creating Stripe session')
  })

  it('should cancel a subscription', async () => {
    const adapter = new StripeAdapter('API_KEY')

    mockListCustomers.mockResolvedValue({
      data: [
        {
          id: 'cus_123',
          email: 'test@wabe.dev',
        },
      ],
    } as never)

    mockListSubscriptions.mockResolvedValue({
      data: [
        {
          id: 'sub_123',
        },
      ],
    } as never)

    await adapter.cancelSubscription({
      email: 'test@wabe.dev',
    })

    expect(mockListCustomers).toHaveBeenCalledTimes(1)
    expect(mockListCustomers).toHaveBeenCalledWith({
      email: 'test@wabe.dev',
      limit: 1,
    })

    expect(mockCancelSubscription).toHaveBeenCalledTimes(1)
    expect(mockCancelSubscription).toHaveBeenCalledWith('sub_123')
  })

  it("should throw an error if the customer doesn't have any subscription when cancelling a subscription", async () => {
    const adapter = new StripeAdapter('API_KEY')

    mockListCustomers.mockResolvedValue({
      data: [
        {
          id: 'cus_123',
          email: 'test@wabe.dev',
        },
      ],
    } as never)

    mockListSubscriptions.mockResolvedValue({
      data: [],
    } as never)

    expect(
      adapter.cancelSubscription({
        email: 'test@wabe.dev',
      }),
    ).rejects.toThrow("Customer don't have any subscription")
  })

  it("should throw an error if the customer doesn't have any subscription when cancelling a subscription", async () => {
    const adapter = new StripeAdapter('API_KEY')

    mockListCustomers.mockResolvedValue({
      data: [
        {
          id: 'cus_123',
          email: 'test@wabe.dev',
        },
      ],
    } as never)

    mockListSubscriptions.mockResolvedValue({
      data: [],
    } as never)

    expect(
      adapter.cancelSubscription({
        email: 'test@wabe.dev',
      }),
    ).rejects.toThrow("Customer don't have any subscription")
  })

  it('should get all invoices of a customer', async () => {
    const adapter = new StripeAdapter('API_KEY')

    mockListCustomers.mockResolvedValue({
      data: [
        {
          id: 'cus_123',
          email: 'test@wabe.dev',
        },
      ],
    } as never)

    mockGetInvoices.mockResolvedValue({
      data: [
        {
          amount_due: 1000,
          amount_paid: 0,
          currency: 'eur',
          id: 'in_123',
          created: 1679481600,
          paid: false,
        },
      ],
    } as never)

    const invoices = await adapter.getInvoices({
      email: 'test@wabe.dev',
    })

    expect(mockListCustomers).toHaveBeenCalledTimes(1)
    expect(mockListCustomers).toHaveBeenCalledWith({
      email: 'test@wabe.dev',
      limit: 1,
    })

    expect(mockGetInvoices).toHaveBeenCalledTimes(1)
    expect(mockGetInvoices).toHaveBeenCalledWith({
      customer: 'cus_123',
      limit: 1,
    })

    expect(invoices).toEqual([
      {
        amountDue: 1000,
        amountPaid: 0,
        currency: Currency.EUR,
        id: 'in_123',
        created: 1679481600,
        invoiceUrl: '',
        isPaid: false,
      },
    ])
  })

  it("should throw an error if the customer doesn't exist when getting invoices", async () => {
    const adapter = new StripeAdapter('API_KEY')

    mockListCustomers.mockResolvedValue({
      data: [],
    } as never)

    expect(
      adapter.getInvoices({
        email: 'test@wabe.dev',
      }),
    ).rejects.toThrow('Customer not found')
  })
})
