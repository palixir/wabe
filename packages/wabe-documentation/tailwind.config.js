const { heroui } = require('@heroui/react')

module.exports = {
  content: [
    './components/**/*.tsx',
    './docs/**/*.mdx',
    '../../node_modules/@heroui/**/*.{js,ts,jsx,tsx,mjs}',
    './node_modules/@heroui/**/*.{js,ts,jsx,tsx,mjs}',
  ],
  theme: {
    extend: {},
  },
  darkMode: 'class',
  plugins: [
    heroui({
      defaultTheme: 'light',
      addCommonColors: true,
      themes: {
        dark: {
          colors: {
            background: '#121212',
            'background-secondary': '#18181b',
            'muted-foreground': '#ABA9A3',
            foreground: '#EEEEEC',
          },
        },
        light: {
          colors: {
            background: '#ffffff',
            'background-secondary': '#f8f9fa',
          },
        },
      },
    }),
  ],
}
