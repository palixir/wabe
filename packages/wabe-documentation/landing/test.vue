
<script setup lang="ts">
import './tailwind.css'

import { ref, computed } from 'vue'

const darkMode = ref(false) // or use your theme management logic

const themeClass = computed(() => (darkMode.value ? 'dark' : ''))
</script>

<template>
  <div :class="themeClass">
    <!-- Hero Section -->
    <section class="bg-gradient-to-r from-blue-900 to-blue-600 text-white py-16">
      <div class="container mx-auto px-4 py-16 flex flex-col items-center text-center">
        <h1 class="text-4xl font-bold mb-4">Empower Your Development with Wabe</h1>
        <p class="text-lg mb-8">The open-source backend-as-a-service solution built with TypeScript. Fast, secure, and extensible.</p>
        <a href="#get-started" class="bg-blue-600 text-white py-2 px-4 rounded-lg font-semibold shadow-lg hover:bg-blue-700 transition-colors">Get Started</a>
      </div>
    </section>

    <!-- Features Section -->
    <section class="bg-gray-100 dark:bg-gray-900 py-16">
      <div class="container mx-auto px-4">
        <h2 class="text-3xl font-semibold text-center mb-8">Features</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <div class="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
            <h3 class="text-xl font-semibold mb-4">Authentication</h3>
            <p>Seamless authentication with email, password, OAuth, and custom methods.</p>
          </div>
          <div class="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
            <h3 class="text-xl font-semibold mb-4">GraphQL API</h3>
            <p>Powerful and flexible GraphQL API to interact with your data.</p>
          </div>
          <div class="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
            <h3 class="text-xl font-semibold mb-4">Permissions Security</h3>
            <p>Granular permissions to secure your data and control access.</p>
          </div>
          <div class="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
            <h3 class="text-xl font-semibold mb-4">Hooks System</h3>
            <p>Before and after request hooks for fine-tuned control over your database interactions.</p>
          </div>
          <div class="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
            <h3 class="text-xl font-semibold mb-4">File Upload</h3>
            <p>Easy file uploads integrated into your backend service.</p>
          </div>
          <div class="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
            <h3 class="text-xl font-semibold mb-4">Dashboard & Integrations</h3>
            <p>Comprehensive dashboard and upcoming Mailgun & Stripe integrations.</p>
          </div>
        </div>
      </div>
    </section>

    <!-- Future Features Section -->
    <section class="bg-gray-200 dark:bg-gray-800 py-16">
      <div class="container mx-auto px-4">
        <h2 class="text-3xl font-semibold text-center mb-8">Coming Soon</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <div class="p-6 bg-white dark:bg-gray-900 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
            <h3 class="text-xl font-semibold mb-4">Mailgun Integration</h3>
            <p>Effortlessly integrate with Mailgun to handle your email services.</p>
          </div>
          <div class="p-6 bg-white dark:bg-gray-900 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
            <h3 class="text-xl font-semibold mb-4">Stripe Integration</h3>
            <p>Seamless payment processing with Stripe.</p>
          </div>
          <div class="p-6 bg-white dark:bg-gray-900 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
            <h3 class="text-xl font-semibold mb-4">Generated REST API</h3>
            <p>Automatic REST API generation for added flexibility.</p>
          </div>
          <div class="p-6 bg-white dark:bg-gray-900 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
            <h3 class="text-xl font-semibold mb-4">Enhanced Dashboard</h3>
            <p>Advanced analytics and management tools in the dashboard.</p>
          </div>
        </div>
      </div>
    </section>

    <!-- Get Started Section -->
    <section class="bg-gray-900 text-white py-16">
      <div class="container mx-auto px-4 text-center">
        <h2 class="text-3xl font-bold mb-4">Get Started with Wabe</h2>
        <p class="text-lg mb-8">Ready to integrate Wabe into your project? Use the following command:</p>
        <code class="bg-gray-800 text-white py-2 px-4 rounded-lg font-mono text-xl">bun add wabe</code>
      </div>
    </section>
  </div>
</template>

