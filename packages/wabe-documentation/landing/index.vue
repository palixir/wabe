<script setup lang="ts">
import './tailwind.css'

import { onMounted } from 'vue'

import Card from './Card.vue'
import Package from './Package.vue'

onMounted(() => {
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Wabe',
    url: 'https://wabe.dev',
    description:
      'Wabe simplifies backend development. It offers essential features like Authentication, Permissions, Database Management, Hooks, and more.',
    author: {
      '@type': 'Organization',
      name: 'Wabe',
    },
    publisher: {
      '@type': 'Organization',
      name: 'Wabe',
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': 'https://wabe.dev',
    },
  }

  const script = document.createElement('script')
  script.type = 'application/ld+json'
  script.text = JSON.stringify(structuredData)

  document.head.appendChild(script)
})
</script>


<template>

<div class="bg-gradient-to-r from-background-primary via-background-secondary to-background-primary">
    <!-- Hero Section with Classic Dark Background -->
    <header class="py-20 flex items-center">
        <div class="max-w-5xl mx-auto text-center">

            <div class="flex flex-col gap-4">
                <h1 class="text-5xl font-extrabold text-gray-100">Wabe</h1>

                <p class="text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">Create your Backend in minutes not days.</p>

                <p class="text-lg font-semibold max-w-4xl text-white">Wabe simplifies backend development. It offers essential features like Authentication, Permissions, Database Management, Hooks, and so much more, providing everything you need to build and scale secure applications effortlessly.</p>
            </div>

            <div class="mt-8 flex justify-center space-x-4">
                <a href="/wabe/start" class="bg-primary text-white px-8 py-3 rounded-lg font-medium hover:bg-secondary transition duration-150">Get started</a>

                <a href="https://github.com/palixir/wabe" rel="noopener noreferrer" class="flex items-center gap-2 bg-background-primary text-white px-8 py-3 rounded-lg font-medium hover:bg-gray-800 transition duration-150" target="_blank">
                    <img src="/github.webp" alt="GitHub" class="h-6"/>

                    Star us on GitHub
                </a>
            </div>
        </div>
    </header>

    <!-- Key Goals Section with Classic Dark Background -->
    <section id="goals" class="py-20">
        <div class="max-w-5xl mx-auto text-center">
            <h2 class="text-4xl font-extrabold text-gray-100">Our philosophy</h2>
            <p class="mt-4 text-lg text-gray-300">Wabe is built with strong principles in mind. Because quality is always better than quantity</p>

            <div class="mt-12 grid grid-cols-1 md:grid-cols-4 gap-8">
                <!-- Goal 1: Performance -->
                <Card title="🚀 Performance" description="Optimized for speed, Wabe ensures your backend runs at peak efficiency." variant="principle"/>

                 <!-- Goal 2: Security -->
                <Card title="🔧 Security" description="Advanced security measures are built into every layers to protect your data." variant="principle"/>

                <!-- Goal 3: Easy to Use -->
                <Card title="🧩 Easy to use" description="Developer-friendly tools and APIs make it easy to get started and productive quickly." variant="principle" />

               <!-- Goal 4: Fully Tested -->
                <Card title="📝 Fully tested" description="Wabe is thoroughly tested to ensure reliability and stability in all environments." variant="principle"/>
            </div>
        </div>
    </section>

    <!-- Features Section with Classic Dark Background -->
    <section id="features" class="py-20">
        <div class="max-w-5xl mx-auto text-center">
            <h2 class="text-4xl font-extrabold text-gray-100">Features</h2>
            <p class="mt-4 text-lg text-gray-300">Unlock the power to produce like a team of hundreds and launch your product in days. Get access to a scalable, secure backend solution built for rapid growth and success.</p>

            <div class="mt-12 grid grid-cols-1 md:grid-cols-3 gap-8">
                <Card href="/config/authentication/sessions" title="Authentication" description="Secure and scalable authentication for your applications." variant="feature" iconName="auth.webp"/>

                <Card href="/security/index" title="Permissions" description="Granular permissions control to secure your resources." variant="feature" iconName="permissions.webp"/>

                <Card href="/database/index" title="Database" description="A powerful, scalable database to store and manage you data." variant="feature" iconName="database.webp"/>

                <Card href="/graphql/api" title="GraphQL API" description="A flexible and powerful GraphQL API (following GraphQL Relay standard) to interact with your data." variant="feature" iconName="graphql.webp"/>

                <Card href="/config/hooks" title="Hooks" description="Powerful hooks system to execute custom actions before or after database requests." iconName="hooks.webp"/>

                <Card href="/email/index" title="Emails" description="Send emails with your favorite provider with very simple integration." iconName="email.webp"/>

                <Card href="/payment/index" title="Payments" description="Accept payments with Stripe or create your own payment provider adapter." iconName="payment.webp"/>
            </div>
        </div>
    </section>


    <!-- Future Features Section with Card Design -->
    <section id="future" class="py-20">
        <div class="max-w-3xl mx-auto text-center">
            <h2 class="text-4xl font-extrabold text-gray-100">Roadmap</h2>
            <p class="mt-4 text-lg text-gray-300">Today, we've achieved several of our key milestones, but this is just the beginning of our journey. The future holds incredible potential, and here are some of our main goals moving forward ! 🚀</p>

            <div class="mt-12 flex gap-8">
                <Card title="Fully featured Dashboard" description="Visualize and manage your data with a powerful new dashboard." variant="feature" isComingSoon/>
                <Card title="Fully generated REST API" description="Automate your API generation with a fully generated REST API." variant="feature" isComingSoon/>
            </div>
        </div>
    </section>

   <!-- Getting Started Section with Classic Dark Background -->
    <section id="getting-started" class="py-20">
        <div class="text-center flex flex-col justify-center gap-4">
            <div>
                <h2 class="text-3xl font-extrabold text-gray-100">Fully Open Source - Get started in minutes</h2>
                <p class="mt-4 text-lg text-gray-300 font-medium">You can start using Wabe in minutes by running:</p>
            </div>

            <div class="flex flex-col gap-2 justify-center">
                <div class="flex justify-center">
                    <Package />
                </div>

                <div class="mt-8">
                    <a href="https://github.com/palixir/wabe"  rel="noopener noreferrer" class="bg-primary text-white px-8 py-3 rounded-lg font-medium hover:bg-blue-600 transition duration-150" target="_blank">View on GitHub</a>
                </div>
            </div>
        </div>
    </section>

    <!-- Footer -->
    <footer class="text-gray-400">
        <div class="flex flex-col gap-3 justify-center items-center p-8">
            <div class="text-center text-gray-400 flex flex-col gap-1">
                <p>Wabe is powered by <strong><a href="https://bun.sh">Bun</a></strong> !</p>
                <p>Wabe powered <strong><a href="https://shipmysaas.com">ShipMySaaS</a></strong> !</p>
            </div>

            <div class="text-center text-gray-500 text-sm">
                <p>&copy; 2024 Wabe. All rights reserved.</p>
            </div>
        </div>
  </footer>
</div>

</template>
