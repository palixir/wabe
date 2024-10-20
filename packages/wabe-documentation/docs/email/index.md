# Send emails

With Wabe, you have the ability to send emails either by using official adapters or by creating your own. You can then access it in your controllers or send an email using the GraphQL sendEmail mutation.

```ts
// With controller
const fn = async (context: WabeContext<any>) => {
 await context.controllers.email.send(...)
}

// With graphql mutation
sendEmail(input: SendEmailInput!): Boolean
```

## Email configuration

You can configure the email adapter (see below for the available adapters) and the main email to use for emails sent by Wabe (for example your support email). You can also provided your own html templates that Wabe can use to send emails provided by Wabe like `sendConfirmationCode` (with mutation sendConfirmationCode). If you don't provide your own templates, Wabe will use the default ones.

```ts
import { Wabe } from "wabe";
import { ResendAdapter } from "wabe-resend";

const run = async () => {
  const wabe = new Wabe({
    // ... others config fields
    email: {
      adapter: new ResendAdapter("API_KEY"),
      mainEmail: 'support@yourcompany.com',
      htmlTemplates: {
        sendConfirmationCode: (payload: any) =>
          `<h1>Hello ${payload.name}</h1><p>You have a new confirmation code: ${payload.code}</p>`,
      }
    },
  });

  await wabe.start();
};

await run();
```

## Resend adapter

You can easily initialize an adapter like this by passing your API key as a parameter to the adapter.

```ts
import { Wabe } from "wabe";
import { ResendAdapter } from "wabe-resend";

const run = async () => {
  const wabe = new Wabe({
    // ... others config fields
    email: {
      adapter: new ResendAdapter("API_KEY"),
    },
  });

  await wabe.start();
};

await run();
```

## Create your own adapter

You can create your own adapter implementing this interface :

```ts
export interface EmailSendOptions {
  from: string;
  to: Array<string>;
  subject: string;
  node?: React.ReactNode;
  html?: string;
  text?: string;
}

export interface EmailAdapter {
  /**
   * Send an email using the provided adapter
   * @param options Mail options (expeditor, recipient, subject ...)
   * @return The id of the email sended, throw an error if something wrong
   */
  send(options: EmailSendOptions): Promise<string>;
}
```
