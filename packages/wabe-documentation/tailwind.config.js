/** @type {import('tailwindcss').Config} */
module.exports = {
	preflight: false,
	content: [
		'landing/**/*.vue',
		'docs/**/*.md',
		'docs/.vitepress/theme/*.vue',
	],
	darkMode: 'class',
	theme: {
		extend: {
			colors: {
				'background-primary': '#081525',
				'background-secondary': '#0D3348',
				primary: '#49C78B',
				secondary: '#8BB7C4',
			},
		},
	},
}
