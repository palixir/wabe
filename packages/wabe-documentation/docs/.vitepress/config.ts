import { defineConfig } from 'vitepress'

export default defineConfig({
	title: 'Wabe',
	appearance: 'force-dark',
	head: [['link', { rel: 'icon', href: 'favicon.ico' }]],
	themeConfig: {
		search: {
			provider: 'local',
		},
		nav: [
			{ text: 'Home', link: '/' },
			{ text: 'Documentation', link: '/markdown-examples' },
		],
		sidebar: [
			{ text: 'Motivations', link: '/docs/wabe/motivations' },
			{
				text: 'Schema',
				items: [
					{ text: 'Classes', link: '/docs/schema/classes' },
					{
						text: 'Custom resolvers',
						link: '/docs/schema/customResolvers',
					},
					{ text: 'Custom enums', link: '/docs/schema/customEnums' },
					{
						text: 'Custom scalars',
						link: '/docs/schema/customScalars',
					},
				],
			},
			{
				text: 'GraphQL',
				items: [
					{
						text: 'GraphQL API',
						link: '/docs/graphql/api',
					},
					{
						text: 'GraphQL file upload',
						link: '/docs/graphql/fileUpload',
					},
				],
			},
			{
				text: 'Database',
				items: [
					{
						text: 'Database Controller',
						link: '/docs/database/controller',
					},
					{
						text: 'Mongo',
						link: '/docs/database/mongo',
					},
				],
			},
			{
				text: 'Permissions',
				items: [
					{
						text: 'Classes permissions',
						link: '/docs/permissions/classes',
					},
					{
						text: 'Objects permissions',
						link: '/docs/permissions/objects',
					},
				],
			},
			{
				text: 'Hooks',
				items: [
					{ text: 'Why a hook system ?', link: '/docs/hooks/why' },
					{ text: 'How it works ?', link: '/docs/hooks/howItWorks' },
				],
			},
			{
				text: 'Authentication',
				items: [
					{
						text: 'Email password',
						link: '/docs/authentication/emailPassword',
					},
					{
						text: 'Oauth',
						link: '/docs/authentication/oauth',
						items: [
							{
								text: 'Google',
								link: '/docs/authentication/oauth/google',
							},
						],
					},
					{
						text: 'Custom authentication methods',
						link: '/docs/authentication/customMethods',
					},
				],
			},
		],
		socialLinks: [
			{ icon: 'github', link: 'https://github.com/coratgerl/wabe' },
		],
	},
})
