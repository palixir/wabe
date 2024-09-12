import type { MutationResolver, QueryResolver } from './Schema'
import { cancelSubscriptionResolver } from './resolvers/cancelSubscription'
import { createPaymentResolver } from './resolvers/createPayment'
import { getInvoicesResolver } from './resolvers/getInvoices'
import { meResolver } from './resolvers/meResolver'
import { sendEmailResolver } from './resolvers/sendEmail'

export const defaultQueries: {
  [key: string]: QueryResolver<any>
} = {
  me: {
    type: 'Object',
    outputObject: {
      name: 'MeOutput',
      fields: {
        user: {
          type: 'Pointer',
          class: 'User',
        },
      },
    },
    resolve: meResolver,
  },
  getInvoices: {
    type: 'Array',
    typeValue: 'Object',
    required: true,
    outputObject: {
      name: 'Invoice',
      fields: {
        amountDue: {
          type: 'Int',
          required: true,
        },
        amountPaid: {
          type: 'Int',
          required: true,
        },
        currency: {
          type: 'Currency',
          required: true,
        },
        id: {
          type: 'String',
          required: true,
        },
        created: {
          type: 'Int',
          required: true,
        },
        invoiceUrl: {
          type: 'String',
          required: true,
        },
        isPaid: {
          type: 'Boolean',
          required: true,
        },
      },
    },
    description: 'Get invoices of a customer',
    args: {
      email: {
        type: 'Email',
        required: true,
      },
    },
    resolve: getInvoicesResolver,
  },
}

export const defaultMutations: {
  [key: string]: MutationResolver<any>
} = {
  createPayment: {
    type: 'String',
    description:
      'Create a payment with the payment provider. Returns the url to redirect the user to pay',
    args: {
      input: {
        customerEmail: {
          type: 'Email',
          description:
            "The payer's email, if not provided, the payer's email will be the user's email that call the mutation.",
        },
        paymentMode: {
          type: 'PaymentMode',
          required: true,
        },
        successUrl: {
          type: 'String',
          required: true,
        },
        cancelUrl: {
          type: 'String',
          required: true,
        },
        products: {
          type: 'Array',
          typeValue: 'Object',
          object: {
            name: 'Product',
            fields: {
              name: {
                type: 'String',
                required: true,
              },
              unitAmount: {
                type: 'Int',
                required: true,
              },
              quantity: {
                type: 'Int',
                required: true,
              },
            },
          },
          required: true,
          requiredValue: true,
        },
        automaticTax: {
          type: 'Boolean',
        },
        recurringInterval: {
          type: 'PaymentReccuringInterval',
        },
      },
    },
    resolve: createPaymentResolver,
  },
  cancelSubscription: {
    type: 'Boolean',
    args: {
      input: {
        email: {
          type: 'Email',
          required: true,
        },
      },
    },
    resolve: cancelSubscriptionResolver,
  },

  sendEmail: {
    type: 'String',
    description:
      'Send basic email with text and html, returns the id of the email',
    args: {
      input: {
        from: {
          type: 'String',
          required: true,
        },
        to: {
          type: 'Array',
          typeValue: 'String',
          required: true,
          requiredValue: true,
        },
        subject: {
          type: 'String',
          required: true,
        },
        text: {
          type: 'String',
        },
        html: {
          type: 'String',
        },
      },
    },
    resolve: sendEmailResolver,
  },
}
