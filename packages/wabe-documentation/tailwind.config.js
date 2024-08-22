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
		extend: {},
	},
	plugins: [require('daisyui')],
}
