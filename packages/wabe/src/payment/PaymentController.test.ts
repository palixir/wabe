import { describe, expect, it, mock } from 'bun:test'
import { PaymentController } from './PaymentController'
import { Currency, PaymentMode } from './interface'

describe('PaymentController', () => {
  it("should call the adapter's validateWebhook method", async () => {
    const mockValidateWebhook = mock(() => {})

    const adapter = {
      validateWebhook: mockValidateWebhook,
    } as any

    const paymentController = new PaymentController({
      adapter,
      currency: Currency.EUR,
      supportedPaymentMethods: ['card'],
    })

    await paymentController.validateWebhook({
      request: {
        headers: {
          get: () => 'provider',
        },
      },
    })

    expect(mockValidateWebhook).toHaveBeenCalledTimes(1)
    expect(mockValidateWebhook).toHaveBeenCalledWith({
      request: {
        headers: {
          get: expect.any(Function),
        },
      },
    })
  })

  it("should call the adapter's createCoupon method", async () => {
    const mockCreateCoupon = mock(() => {})

    const adapter = {
      createCoupon: mockCreateCoupon,
    } as any

    const paymentController = new PaymentController({
      adapter,
      currency: Currency.EUR,
      supportedPaymentMethods: ['card'],
    })

    await paymentController.createCoupon({
      name: 'TEST',
      amountOff: 10,
      currency: Currency.EUR,
    })

    expect(mockCreateCoupon).toHaveBeenCalledTimes(1)
    expect(mockCreateCoupon).toHaveBeenCalledWith({
      name: 'TEST',
      amountOff: 10,
      currency: Currency.EUR,
    })
  })

  it("should call the adapter's createPromotionCode method", async () => {
    const mockCreatePromotionCode = mock(() => {})

    const adapter = {
      createPromotionCode: mockCreatePromotionCode,
    } as any

    const paymentController = new PaymentController({
      adapter,
      currency: Currency.EUR,
      supportedPaymentMethods: ['card'],
    })

    await paymentController.createPromotionCode({
      code: 'TEST',
      couponId: '123',
    })

    expect(mockCreatePromotionCode).toHaveBeenCalledTimes(1)
    expect(mockCreatePromotionCode).toHaveBeenCalledWith({
      code: 'TEST',
      couponId: '123',
    })
  })

  it("should call the adapter's createCustomer method", async () => {
    const mockCreateCustomer = mock(() => {})

    const adapter = {
      createCustomer: mockCreateCustomer,
    } as any

    const paymentController = new PaymentController({
      adapter,
      currency: Currency.EUR,
      supportedPaymentMethods: ['card'],
    })

    await paymentController.createCustomer({
      customerName: 'John Doe',
      customerEmail: 'john@doe.com',
      customerPhone: '+33612345678',
      address: {
        city: 'Paris',
        country: 'France',
        line1: '1 rue de la Paix',
        line2: '75008 Paris',
        postalCode: '75008',
        state: 'Paris',
      },
      paymentMethod: 'card',
    })

    expect(mockCreateCustomer).toHaveBeenCalledTimes(1)
    expect(mockCreateCustomer).toHaveBeenCalledWith({
      customerName: 'John Doe',
      customerEmail: 'john@doe.com',
      customerPhone: '+33612345678',
      address: {
        city: 'Paris',
        country: 'France',
        line1: '1 rue de la Paix',
        line2: '75008 Paris',
        postalCode: '75008',
        state: 'Paris',
      },
      paymentMethod: 'card',
    })
  })

  it("should call the adapter's createPayment method", async () => {
    const mockCreatePayment = mock(() => {})

    const adapter = {
      createPayment: mockCreatePayment,
    } as any

    const paymentController = new PaymentController({
      adapter,
      currency: Currency.EUR,
      supportedPaymentMethods: ['card'],
    })

    await paymentController.createPayment({
      customerEmail: 'john@doe.com',
      successUrl: 'https://example.com/success',
      cancelUrl: 'https://example.com/cancel',
      paymentMode: PaymentMode.payment,
      products: [{ name: 'Product', unitAmount: 10, quantity: 1 }],
    })

    expect(mockCreatePayment).toHaveBeenCalledTimes(1)
    expect(mockCreatePayment).toHaveBeenCalledWith({
      customerEmail: 'john@doe.com',
      paymentMode: 'payment',
      paymentMethod: ['card'],
      successUrl: 'https://example.com/success',
      cancelUrl: 'https://example.com/cancel',
      currency: 'eur',
      products: [{ name: 'Product', unitAmount: 10, quantity: 1 }],
    })
  })

  it("should call the adapter's cancelSubscription method", async () => {
    const mockCancelSubscription = mock(() => {})

    const adapter = {
      cancelSubscription: mockCancelSubscription,
    } as any

    const paymentController = new PaymentController({
      adapter,
      currency: Currency.EUR,
      supportedPaymentMethods: ['card'],
    })

    await paymentController.cancelSubscription({
      email: 'john@doe.com',
    })

    expect(mockCancelSubscription).toHaveBeenCalledTimes(1)
    expect(mockCancelSubscription).toHaveBeenCalledWith({
      email: 'john@doe.com',
    })
  })

  it("should call the adapter's getInvoices method", async () => {
    const mockGetInvoices = mock(() => {})

    const adapter = {
      getInvoices: mockGetInvoices,
    } as any

    const paymentController = new PaymentController({
      adapter,
      currency: Currency.EUR,
      supportedPaymentMethods: ['card'],
    })

    await paymentController.getInvoices({
      email: 'john@doe.com',
    })

    expect(mockGetInvoices).toHaveBeenCalledTimes(1)
    expect(mockGetInvoices).toHaveBeenCalledWith({
      email: 'john@doe.com',
    })
  })

  it('should get total revenue', async () => {
    const mockGetTotalRevenue = mock(() => {})

    const adapter = {
      getTotalRevenue: mockGetTotalRevenue,
    } as any

    const paymentController = new PaymentController({
      adapter,
      currency: Currency.EUR,
      supportedPaymentMethods: ['card'],
    })

    await paymentController.getTotalRevenue({
      charge: 'gross',
      startRangeTimestamp: 1679481600,
      endRangeTimestamp: 1679481600,
    })

    expect(mockGetTotalRevenue).toHaveBeenCalledTimes(1)
    expect(mockGetTotalRevenue).toHaveBeenCalledWith({
      charge: 'gross',
      startRangeTimestamp: 1679481600,
      endRangeTimestamp: 1679481600,
    })
  })

  it("should call the adapter's getAllTransactions method", async () => {
    const mockGetAllTransactions = mock(() => {})

    const adapter = {
      getAllTransactions: mockGetAllTransactions,
    } as any

    const paymentController = new PaymentController({
      adapter,
      currency: Currency.EUR,
      supportedPaymentMethods: ['card'],
    })

    await paymentController.getAllTransactions({
      startRangeTimestamp: 1679481600,
      endRangeTimestamp: 1679481600,
    })

    expect(mockGetAllTransactions).toHaveBeenCalledTimes(1)
    expect(mockGetAllTransactions).toHaveBeenCalledWith({
      startRangeTimestamp: 1679481600,
      endRangeTimestamp: 1679481600,
    })
  })

  it("should call the adapter's getHypotheticalRevenue method", async () => {
    const mockGetHypotheticalSubscriptionRevenue = mock(() => {})

    const adapter = {
      getHypotheticalSubscriptionRevenue:
        mockGetHypotheticalSubscriptionRevenue,
    } as any

    const paymentController = new PaymentController({
      adapter,
      currency: Currency.EUR,
      supportedPaymentMethods: ['card'],
    })

    await paymentController.getHypotheticalSubscriptionRevenue()

    expect(mockGetHypotheticalSubscriptionRevenue).toHaveBeenCalledTimes(1)
    expect(mockGetHypotheticalSubscriptionRevenue).toHaveBeenCalledWith()
  })
})
