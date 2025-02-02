import * as path from 'node:path'
import { defineConfig } from 'rspress/config'

export default defineConfig({
  root: path.join(__dirname, 'docs'),
  route: {
    cleanUrls: true,
  },
  title: 'Wabe: Your backend in minutes not days',
  description:
    'Wabe simplifies backend development with essential features like Authentication, Payments, Email, and Database, enabling effortless app building and scaling.',
  globalStyles: path.join(__dirname, './styles/index.css'),
  logoText: 'Wabe',
  logo: '/assets/logo.png',
  icon: '/assets/favicon.ico',
  head: [
    '<link rel="icon" href="/assets/favicon.ico">',
    '<link rel="canonical" href="https://wabe.dev">',
    '<script defer src="/_vercel/insights/script.js"></script>',
    '<meta property="og:title" content="Your backend in minutes not days for Node.js / Bun">',
    '<meta property="og:description" content="Wabe simplifies backend development with essential features like Authentication, Payments, Email, and Database, enabling effortless app building and scaling.">',
    '<meta property="twitter:card" content="summary_large_image">',
    '<meta property="twitter:title" content="Wabe">',
    '<meta property="twitter:description" content="Your backend in minutes not days for Node.js / Bun">',
    '<meta property="twitter:image" content="https://wabe.dev/assets/cover.png">',
    '<meta property="twitter:image:alt" content="Preview of the Wabe website">',
    '<meta property="twitter:site" content="@coratgerl">',
  ],
  builderConfig: {
    html: {
      tags: [
        {
          tag: 'script',
          children: "window.RSPRESS_THEME = 'light';",
        },
      ],
    },
  },
  themeConfig: {
    hideNavbar: 'never',
    darkMode: false,
    search: true,
    nav: [
      {
        text: 'Documentation',
        link: '/documentation/wabe/motivations',
        position: 'right',
      },
    ],
    socialLinks: [
      {
        icon: 'github',
        content: 'https://github.com/palixir/wabe',
        mode: 'link',
      },
      { icon: 'X', content: 'https://x.com/coratgerl', mode: 'link' },
    ],
    sidebar: {
      '/wabe/': [
        {
          text: 'Wabe',
          collapsible: true,
          items: [
            { text: 'Motivations', link: '/documentation/wabe/motivations' },
            { text: 'Quick start', link: '/documentation/wabe/start' },
            { text: 'Wabe concepts', link: '/documentation/wabe/concepts' },
          ],
        },
        {
          text: 'Configuration',
          collapsible: true,
          items: [
            {
              text: 'Schema',
              collapsible: true,
              items: [
                {
                  text: 'Classes',
                  link: '/documentation/config/schema/classes',
                },
                {
                  text: 'Resolvers',
                  link: '/documentation/config/schema/resolvers',
                },
                { text: 'Enums', link: '/documentation/config/schema/enums' },
                {
                  text: 'Scalars',
                  link: '/documentation/config/schema/scalars',
                },
              ],
            },
            { text: 'Files', link: '/documentation/config/files' },
            {
              text: 'Authentication',
              collapsible: true,
              items: [
                {
                  text: 'Sign In / Up / Out',
                  link: '/documentation/config/authentication/interact',
                },
                {
                  text: 'Default auth methods',
                  link: '/documentation/config/authentication/defaultMethods',
                },
                {
                  text: 'Social login (OAuth)',
                  link: '/documentation/config/authentication/oauth',
                },
                {
                  text: 'Reset password',
                  link: '/documentation/config/authentication/resetPassword',
                },
                {
                  text: 'Sessions',
                  link: '/documentation/config/authentication/sessions',
                },
                {
                  text: 'Roles',
                  link: '/documentation/config/authentication/roles',
                },
                {
                  text: 'Create custom methods',
                  link: '/documentation/config/authentication/customMethods',
                },
              ],
            },
            { text: 'Hooks', link: '/documentation/config/hooks' },
            { text: 'Routes', link: '/documentation/config/routes' },
            { text: 'Codegen', link: '/documentation/config/codegen' },
            { text: 'Root key', link: '/documentation/config/rootKey' },
          ],
        },
        {
          text: 'Interact with database',
          collapsible: true,
          items: [
            { text: 'GraphQL', link: '/documentation/graphql/api' },
            { text: 'Database', link: '/documentation/database/index' },
          ],
        },
        {
          text: 'Security',
          link: '/documentation/security/index',
        },
        { text: 'File', link: '/documentation/file/index' },
        { text: 'Email', link: '/documentation/email/index' },
        { text: 'Payment', link: '/documentation/payment/index' },
        { text: 'AI', link: '/documentation/ai/index' },
      ],
    },
  },
})
