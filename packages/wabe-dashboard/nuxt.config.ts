// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  devServer: {
    port: 3000,
  },
  compatibilityDate: '2024-11-01',
  devtools: { enabled: true },
  modules: [
    '@nuxtjs/tailwindcss',
    '@nuxt/ui',
    '@nuxtjs/storybook',
    '@nuxtjs/apollo',
  ],
  storybook: {
    route: '/__storybook__',
    port: 6006,
  },
  apollo: {
    clients: {
      default: {
        connectToDevTools: true,
        httpEndpoint: 'http://127.0.0.1:3001/graphql',
      },
    },
  },
})
