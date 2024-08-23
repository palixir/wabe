<template>
  <div class="flex flex-col gap-2">
    <!-- Tab Navigation -->
    <div class="flex gap-1">
      <button
        v-for="tab in tabs"
        :key="tab"
        @click="selectedTab = tab"
        :class="[
          'px-4 py-2 border rounded',
          selectedTab === tab
            ? 'bg-blue-500 text-white border-blue-500'
            : 'bg-gray-100 text-gray-700 border-gray-300'
        ]"
      >
        {{ tab }}
      </button>
    </div>

    <!-- Display Command -->
    <div class="bg-gray-900 p-4 border border-gray-300 rounded flex items-center justify-between">
      <code class="text-primary">{{ installCommand }}</code>
		 	<button @click="copyToClipboard" class="px-3 py-1 text-primary rounded">
				<img src="copy.png" alt="Copy to clipboard" class="h-6">
			</button>
		</div>

	</div>
</template>

<script setup>
import { ref, computed } from 'vue'

// Tabs for package managers
const tabs = ['npm', 'yarn', 'pnpm', 'bun']

// Reactive property for the selected tab
const selectedTab = ref('npm')

// Computed property to get the installation command based on the selected tab
const installCommand = computed(() => {
	switch (selectedTab.value) {
		case 'npm':
			return 'npm install wabe'
		case 'yarn':
			return 'yarn add wabe'
		case 'pnpm':
			return 'pnpm add wabe'
		case 'bun':
			return 'bun add wabe'
		default:
			return ''
	}
})

// Function to copy the command to the clipboard
const copyToClipboard = async () => {
	try {
		await navigator.clipboard.writeText(installCommand.value)
	} catch (err) {
		console.error('Copy failed:', err)
	}
}
</script>
