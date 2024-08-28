import { defineConfig } from 'vitepress'

export default defineConfig({
	title: 'Wabe',
	appearance: 'force-dark',
	head: [['link', { rel: 'icon', href: 'favicon.ico' }]],
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
						link: '/security/index.md',
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
		],
		socialLinks: [
			{ icon: 'github', link: 'https://github.com/coratgerl/wabe' },
		],
	},
})
