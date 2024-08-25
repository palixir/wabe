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
			{ text: 'Documentation', link: '/wabe/motivations' },
		],
		sidebar: [
			{ text: 'Motivations', link: '/wabe/motivations' },
			{ text: 'Quick start', link: '/wabe/start' },
			{
				text: 'Schema',
				items: [
					{ text: 'Classes', link: '/schema/classes' },
					{
						text: 'Custom resolvers',
						link: '/schema/customResolvers',
					},
					{ text: 'Custom enums', link: '/schema/customEnums' },
					{
						text: 'Custom scalars',
						link: '/schema/customScalars',
					},
				],
			},
			{
				text: 'GraphQL',
				items: [
					{
						text: 'GraphQL API',
						link: '/graphql/api',
					},
					{
						text: 'GraphQL file upload',
						link: '/graphql/fileUpload',
					},
				],
			},
			{
				text: 'Database',
				items: [
					{
						text: 'Database Controller',
						link: '/database/controller',
					},
					{
						text: 'Mongo',
						link: '/database/mongo',
					},
				],
			},
			{
				text: 'Permissions',
				items: [
					{
						text: 'Classes permissions',
						link: '/permissions/classes',
					},
					{
						text: 'Objects permissions',
						link: '/permissions/objects',
					},
				],
			},
			{
				text: 'Hooks',
				items: [
					{ text: 'Why a hook system ?', link: '/hooks/why' },
					{ text: 'How it works ?', link: '/hooks/howItWorks' },
				],
			},
			{
				text: 'Authentication',
				items: [
					{
						text: 'Email password',
						link: '/authentication/emailPassword',
					},
					{
						text: 'Oauth',
						link: '/authentication/oauth',
						items: [
							{
								text: 'Google',
								link: '/authentication/oauth/google',
							},
						],
					},
					{
						text: 'Custom authentication methods',
						link: '/authentication/customMethods',
					},
				],
			},
		],
		socialLinks: [
			{ icon: 'github', link: 'https://github.com/coratgerl/wabe' },
		],
	},
})
