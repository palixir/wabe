import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'Wabe',
  description:
    'Wabe simplifies backend development with essential features like Authentication, Payments, Email, and Database, enabling effortless app building and scaling.',
  appearance: 'force-dark',
  head: [
    ['link', { rel: 'icon', href: 'favicon.ico' }],
    ['link', { rel: 'canonical', href: 'https://wabe.dev' }],
    ['script', { src: '/_vercel/insights/script.js', defer: 'true' }],
    [
      'meta',
      {
        property: 'og:title',
        content: 'Your backend in minutes not days for Node.js / Bun',
      },
    ],
    [
      'meta',
      {
        property: 'og:description',
        content:
          'Wabe simplifies backend development with essential features like Authentication, Payments, Email, and Database, enabling effortless app building and scaling.',
      },
    ],
    [
      'meta',
      {
        property: 'twitter:card',
        content: 'summary_large_image',
      },
    ],
    [
      'meta',
      {
        property: 'twitter:title',
        content: 'Wabe',
      },
    ],
    [
      'meta',
      {
        property: 'twitter:description',
        content: 'Your backend in minutes not days for Node.js / Bun',
      },
    ],
    [
      'meta',
      {
        property: 'twitter:image',
        content: 'https://wabe.dev/cover2.webp',
      },
    ],
    [
      'meta',
      {
        property: 'twitter:image:alt',
        content: 'Preview of the Wabe website',
      },
    ],
    [
      'meta',
      {
        property: 'twitter:site',
        content: '@coratgerl',
      },
    ],
  ],
  themeConfig: {
    search: {
      provider: 'local',
    },
    outline: {
      level: 'deep',
    },
    nav: [
      { text: 'Home', link: '/' },
      { text: 'Documentation', link: '/wabe/motivations' },
    ],
    sidebar: [
      { text: 'Motivations', link: '/wabe/motivations' },
      { text: 'Quick start', link: '/wabe/start' },
      {
        text: 'Wabe concepts',
        link: '/wabe/concepts',
      },
      {
        text: 'Configuration',
        items: [
          {
            text: 'Schema',
            items: [
              { text: 'Classes', link: '/config/schema/classes' },
              {
                text: 'Resolvers',
                link: '/config/schema/resolvers',
              },
              { text: 'Enums', link: '/config/schema/enums' },
              {
                text: 'Scalars',
                link: '/config/schema/scalars',
              },
            ],
          },
          { text: 'Files', link: '/config/files' },
          {
            text: 'Authentication',
            items: [
              {
                text: 'Sign In / Up',
                link: '/config/authentication/interact',
              },
              {
                text: 'Reset password',
                link: '/config/authentication/resetPassword',
              },
              {
                text: 'Sessions',
                link: '/config/authentication/sessions',
              },
              {
                text: 'Roles',
                link: '/config/authentication/roles',
              },
              {
                text: 'OAuth',
                link: '/config/authentication/oauth',
              },
              {
                text: 'Custom methods',
                link: '/config/authentication/customMethods',
              },
            ],
          },
          { text: 'Hooks', link: '/config/hooks' },
          { text: 'Routes', link: '/config/routes' },
          { text: 'Codegen', link: '/config/codegen' },
          {
            text: 'Root key',
            link: '/config/rootKey',
          },
          {
            text: 'Security',
            link: '/config/security',
          },
        ],
      },
      {
        text: 'Interact with database',
        items: [
          {
            text: 'GraphQL',
            link: '/graphql/api',
          },
          {
            text: 'Database',
            link: '/database/index',
          },
        ],
      },
      {
        text: 'Security',
        items: [
          {
            text: 'Permissions',
            link: '/security/index',
          },
        ],
      },
      {
        text: 'Email',
        link: '/email/index.md',
      },
      {
        text: 'Payment',
        link: '/payment/index.md',
      },
      {
        text: 'AI',
        link: '/ai/index.md',
      },
    ],
    socialLinks: [
      {
        icon: 'github',
        link: 'https://github.com/palixir/wabe',
        ariaLabel: 'GitHub',
      },
      { icon: 'twitter', link: 'https://x.com/coratgerl', ariaLabel: 'X' },
    ],
  },
})
