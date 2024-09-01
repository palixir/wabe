<script setup lang="ts">
import './tailwind.css'

import Card from './Card.vue'
import Package from './Package.vue'
</script>


<template>

<div class="bg-gradient-to-r from-background-primary via-background-secondary to-background-primary">
    <!-- Hero Section with Classic Dark Background -->
    <header class="py-20 flex items-center ">    
        <div class="max-w-5xl mx-auto text-center">

            <div class="flex flex-col gap-4">
                <h1 class="text-5xl font-extrabold text-gray-100">Wabe</h1>
            
                <p class="text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">Create your Backend in minutes not days.</p>

                <p class="text-lg font-semibold max-w-4xl">Wabe simplifies backend development. It offers essential features like Authentication, Permissions, Database Management, Hooks, and so much more, providing everything you need to build and scale secure applications effortlessly.</p>
            </div>
            
            <div class="mt-8 flex justify-center space-x-4">
                <a href="/wabe/motivations" class="bg-primary text-white px-8 py-3 rounded-lg font-medium hover:bg-secondary transition duration-150">Get Started</a>

                <a href="https://github.com/palixir/wabe" class="bg-background-primary text-white px-8 py-3 rounded-lg font-medium hover:bg-gray-800 transition duration-150">
                    GitHub
                </a>
            </div>
        </div>
    </header>

    <!-- Key Goals Section with Classic Dark Background -->
    <section id="goals" class="py-20">
        <div class="max-w-5xl mx-auto text-center">
            <h2 class="text-4xl font-extrabold text-gray-100">Wabe is built with strong principles in mind.</h2>
            
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
            <p class="mt-4 text-lg text-gray-300">Wabe offers a comprehensive set of features to power your backend.</p>

            <div class="mt-12 grid grid-cols-1 md:grid-cols-3 gap-8">
                <Card href="/config/authentication/sessions" title="Authentication" description="Secure and scalable authentication for your applications." variant="feature" iconName="auth.png"/>
                
                <Card href="/security/index" title="Permissions" description="Granular permissions control to secure your resources." variant="feature" iconName="permissions.png"/>
                
                <Card href="/database/index" title="Database" description="A powerful, scalable database to store and manage you data." variant="feature" iconName="database.png"/>

                <Card href="/graphql/api" title="GraphQL API" description="A flexible and powerful GraphQL API (following GraphQL Relay standard) to interact with your data." variant="feature" iconName="graphql.png"/>

                <Card href="/config/hooks" title="Hooks" description="Powerful hooks system to execute custom actions before or after database requests." iconName="hooks.png"/>

            </div>
        </div>
    </section>

 
    <!-- Future Features Section with Card Design -->
    <section id="future" class="py-20">
        <div class="max-w-5xl mx-auto text-center">
            <h2 class="text-4xl font-extrabold text-gray-100">Roadmap</h2>
            <p class="mt-4 text-lg text-gray-300">We're working hard to build the ultimate tool, and exciting about the future of Wabe 🤩</p>
            
            <div class="mt-12 grid grid-cols-1 md:grid-cols-3 gap-8">
                <Card title="Fully featured Dashboard" description="Visualize and manage your data with a powerful new dashboard." variant="feature" isComingSoon/>

                <Card title="Stripe and Mailgun" description="Seamlessly connect with Stripe for payments and Mailgun for emails." variant="feature" isComingSoon/>

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
                    <a href="https://github.com/palixir/wabe" class="bg-primary text-white px-8 py-3 rounded-lg font-medium hover:bg-blue-600 transition duration-150">View on GitHub</a>
                </div>
            </div>
        </div>
    </section>
 
    <!-- Footer -->
    <footer class="text-gray-400">
        <div class="flex justify-center items-center p-8">
            <div class="text-center text-gray-500 text-sm">
                <p>&copy; 2024 Wabe. All rights reserved.</p>
            </div>
        </div>
  </footer>
</div>

</template>
