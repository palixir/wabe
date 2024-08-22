<script setup lang="ts">
import './tailwind.css'
</script>

<template>

    <!-- Hero Section with Classic Dark Background -->
    <header class="bg-gray-900 py-20 flex items-center">    
        <div class="max-w-5xl mx-auto text-center">
            <h1 class="text-5xl font-extrabold text-gray-100">Wabe</h1>
            <p class="mt-4 text-2xl text-gray-300">Your Backend in Minutes, Not Days</p>
            <div class="mt-8 flex justify-center space-x-4">
                <a href="#docs" class="bg-blue-500 text-white px-8 py-3 rounded-lg font-medium hover:bg-blue-600 transition duration-150">Get Started</a>
                <a href="https://github.com/your-repo" class="bg-gray-700 text-white px-8 py-3 rounded-lg font-medium hover:bg-gray-800 transition duration-150">GitHub</a>
            </div>
        </div>
    </header>

    <!-- Key Goals Section with Classic Dark Background -->
    <section id="goals" class="bg-gray-800 py-20">
        <div class="max-w-5xl mx-auto text-center">
            <h2 class="text-3xl font-extrabold text-gray-100">Our Key Goals</h2>
            <p class="mt-4 text-lg text-gray-300">Wabe is built with the following principles in mind.</p>
            <div class="mt-12 grid grid-cols-1 md:grid-cols-4 gap-8">
                <!-- Goal 1: Performance -->
                <div class="bg-gray-700 p-6 rounded-lg shadow-lg">
                    <h3 class="text-xl font-semibold text-gray-100">Performance</h3>
                    <p class="mt-4 text-gray-300">Optimized for speed, Wabe ensures your backend runs at peak efficiency.</p>
                </div>
                <!-- Goal 2: Security -->
                <div class="bg-gray-700 p-6 rounded-lg shadow-lg">
                    <h3 class="text-xl font-semibold text-gray-100">Security</h3>
                    <p class="mt-4 text-gray-300">Advanced security measures are built into every layer to protect your data.</p>
                </div>
                <!-- Goal 3: Easy to Use -->
                <div class="bg-gray-700 p-6 rounded-lg shadow-lg">
                    <h3 class="text-xl font-semibold text-gray-100">Easy to Use</h3>
                    <p class="mt-4 text-gray-300">Developer-friendly tools and APIs make it easy to get started and productive quickly.</p>
                </div>
                <!-- Goal 4: Fully Tested -->
                <div class="bg-gray-700 p-6 rounded-lg shadow-lg">
                    <h3 class="text-xl font-semibold text-gray-100">Fully Tested</h3>
                    <p class="mt-4 text-gray-300">Wabe is thoroughly tested to ensure reliability and stability in all environments.</p>
                </div>
            </div>
        </div>
    </section>

    <!-- Features Section with Classic Dark Background -->
    <section id="features" class="bg-gray-800 py-20">
        <div class="max-w-5xl mx-auto text-center">
            <h2 class="text-3xl font-extrabold text-gray-100">Features</h2>
            <p class="mt-4 text-lg text-gray-300">Wabe offers a comprehensive set of features to power your backend.</p>
            <div class="mt-12 grid grid-cols-1 md:grid-cols-3 gap-8">
                <!-- Feature 1: Authentication -->
                <div class="bg-gray-700 p-6 rounded-lg shadow-lg">
                    <h3 class="text-xl font-semibold text-gray-100">Authentication</h3>
                    <p class="mt-4 text-gray-300">Secure and scalable authentication for your applications.</p>
                </div>
                <!-- Feature 2: Database -->
                <div class="bg-gray-700 p-6 rounded-lg shadow-lg">
                    <h3 class="text-xl font-semibold text-gray-100">Database</h3>
                    <p class="mt-4 text-gray-300">A powerful, scalable database to store and manage your data.</p>
                </div>
                <!-- Feature 3: Permissions -->
                <div class="bg-gray-700 p-6 rounded-lg shadow-lg">
                    <h3 class="text-xl font-semibold text-gray-100">Permissions</h3>
                    <p class="mt-4 text-gray-300">Granular permissions control to secure your resources.</p>
                </div>
                <!-- Feature 4: GraphQL API -->
                <div class="bg-gray-700 p-6 rounded-lg shadow-lg">
                    <h3 class="text-xl font-semibold text-gray-100">GraphQL API</h3>
                    <p class="mt-4 text-gray-300">A flexible and powerful GraphQL API to interact with your data.</p>
                </div>
                <!-- Feature 5: Integration -->
                <div class="bg-gray-700 p-6 rounded-lg shadow-lg">
                    <h3 class="text-xl font-semibold text-gray-100">Integration</h3>
                    <p class="mt-4 text-gray-300">Seamlessly integrates with your existing tools and workflows.</p>
                </div>
            </div>
        </div>
    </section>

    <!-- Open Source Section with Classic Dark Background -->
    <section id="open-source" class="bg-gray-800 py-20">
        <div class="max-w-5xl mx-auto text-center">
            <h2 class="text-3xl font-extrabold text-gray-100">Open Source</h2>
            <p class="mt-4 text-lg text-gray-300">Wabe is proudly open source. Join our community on GitHub.</p>
            <div class="mt-8">
                <a href="https://github.com/your-repo" class="bg-blue-500 text-white px-8 py-3 rounded-lg font-medium hover:bg-blue-600 transition duration-150">View on GitHub</a>
            </div>
        </div>
    </section>

    <!-- Future Features Section with Card Design -->
    <section id="future" class="bg-gray-800 py-20">
        <div class="max-w-5xl mx-auto text-center">
            <h2 class="text-3xl font-extrabold text-gray-100">What's Coming Next</h2>
            <p class="mt-4 text-lg text-gray-300">We're excited to share what's on the horizon for Wabe.</p>
            <div class="mt-12 grid grid-cols-1 md:grid-cols-3 gap-8">
                <!-- Future Feature 1 -->
                <div class="bg-gray-700 p-6 rounded-lg shadow-lg relative">
                    <h3 class="text-xl font-semibold text-gray-100">Fully Featured Dashboard</h3>
                    <p class="mt-4 text-gray-300">Visualize and manage your data with a powerful new dashboard.</p>
                </div>
                <!-- Future Feature 2 -->
                <div class="bg-gray-700 p-6 rounded-lg shadow-lg relative">
                    <h3 class="text-xl font-semibold text-gray-100">Integrations with Stripe and Mailgun</h3>
                    <p class="mt-4 text-gray-300">Seamlessly connect with Stripe for payments and Mailgun for emails.</p>
                </div>
                <!-- Future Feature 3 -->
                <div class="bg-gray-700 p-6 rounded-lg shadow-lg relative">
                    <h3 class="text-xl font-semibold text-gray-100">Fully Generated REST API</h3>
                    <p class="mt-4 text-gray-300">Automate your API generation with a fully generated REST API.</p>
                </div>
            </div>
        </div>
    </section>

    <!-- Getting Started Section with Classic Dark Background -->
    <section id="getting-started" class="bg-gray-900 py-20">
        <div class="max-w-5xl mx-auto text-center">
            <h2 class="text-3xl font-extrabold text-gray-100">Get Started in Minutes</h2>
            <p class="mt-4 text-lg text-gray-300">You can start using Wabe in minutes by running:</p>
            <div class="mt-8">
                <code class="bg-gray-700 text-gray-100 px-6 py-3 rounded-lg text-lg">bun add wabe</code>
            </div>
        </div>
    </section>

    <!-- Footer -->
    <footer class="bg-gray-900 py-8 text-center">
        <p class="text-gray-400 text-sm">Created with ❤ by coratgerl</p>
    </footer>
  

</template>
