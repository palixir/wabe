import * as path from 'node:path'
import { defineConfig } from 'rspress/config'

export default defineConfig({
  // Wabe because the repository name is wabe (for github pages)
  base: '/wabe/',
  root: path.join(__dirname, 'docs'),
  route: {
    cleanUrls: true,
  },
  title: 'Wabe: Your backend in minutes not days',
  description:
    'Wabe simplifies backend development with essential features like Authentication, Email, and Database, enabling effortless app building and scaling.',
  globalStyles: path.join(__dirname, './styles/index.css'),
  logoText: 'Wabe',
  logo: '/assets/logo.png',
  icon: '/assets/favicon.ico',
  head: [
    '<link rel="icon" href="/assets/favicon.ico">',
    '<link rel="canonical" href="https://palixir.github.io/wabe/">',
    '<script defer src="/_vercel/insights/script.js"></script>',
    '<meta property="og:title" content="Your backend in minutes not days for Node.js / Bun">',
    '<meta property="og:description" content="Wabe simplifies backend development with essential features like Authentication, Email, and Database, enabling effortless app building and scaling.">',
    '<meta property="twitter:card" content="summary_large_image">',
    '<meta property="twitter:title" content="Wabe">',
    '<meta property="twitter:description" content="Your backend in minutes not days for Node.js / Bun">',
    '<meta property="twitter:image" content="https://palixir.github.io/wabe//assets/cover.png">',
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
          text: 'Schema',
          collapsible: true,
          collapsed: true,
          items: [
            {
              text: 'Classes',
              link: '/documentation/config/schema/classes',
            },
            {
              text: 'Resolvers',
              link: '/documentation/schema/resolvers',
            },
            { text: 'Enums', link: '/documentation/schema/enums' },
            {
              text: 'Scalars',
              link: '/documentation/schema/scalars',
            },
          ],
        },
        {
          text: 'Authentication',
          collapsible: true,
          collapsed: true,
          items: [
            {
              text: 'Sign In / Up / Out',
              link: '/documentation/authentication/interact',
            },
            {
              text: 'Default auth methods',
              link: '/documentation/authentication/defaultMethods',
            },
            {
              text: 'Two-factor authentication (2FA)',
              link: '/documentation/authentication/twoFactor',
            },
            {
              text: 'Social login (OAuth)',
              link: '/documentation/authentication/oauth',
            },
            {
              text: 'Email password with SRP protocol',
              link: '/documentation/authentication/emailPasswordSRP',
            },
            {
              text: 'Reset password',
              link: '/documentation/authentication/resetPassword',
            },
            {
              text: 'Sessions',
              link: '/documentation/authentication/sessions',
            },
            {
              text: 'Roles',
              link: '/documentation/authentication/roles',
            },
            {
              text: 'Create custom methods',
              link: '/documentation/authentication/customMethods',
            },
          ],
        },
        { text: 'Hooks', link: '/documentation/hooks' },
        { text: 'Routes', link: '/documentation/routes' },
        { text: 'Codegen', link: '/documentation/codegen' },
        { text: 'Root key', link: '/documentation/rootKey' },
        {
          text: 'Interact with database',
          collapsible: true,
          collapsed: true,
          items: [
            { text: 'GraphQL', link: '/documentation/graphql/api' },
            { text: 'Database', link: '/documentation/database/index' },
          ],
        },
        {
          text: 'Security',
          link: '/documentation/security/index',
        },
        { text: 'Cron', link: '/documentation/cron' },
        { text: 'File', link: '/documentation/file/index' },
        { text: 'Email', link: '/documentation/email/index' },
        { text: 'AI', link: '/documentation/ai/index' },
      ],
    },
  },
})
