<template>
  <div class="flex flex-col w-full justify-center">
    <div class="flex w-full sm:w-96 mx-auto">
      <button
        v-for="tab in tabs"
        :key="tab"
        @click="selectedTab = tab"
        :class="[
          'px-4 py-2',
          selectedTab === tab
            ? 'bg-background-primary text-primary border-blue-500'
            : 'bg-background-secondary text-secondary border-gray-300'
        ]"
      >
        {{ tab }}
      </button>
    </div>

		<div class="bg-gray-900 p-4 mx-auto border border-gray-300 rounded flex items-center justify-between gap-10 w-full sm:w-96">
      <code class="text-primary truncate">{{ installCommand }}</code>

		 	<button @click="copyToClipboard" class="px-3 py-1 text-primary rounded">
				<div class="flex items-center gap-4 p-2">
					<span :class="[isCopied ? '': 'opacity-0']">Copied !</span>
					<img src="copy.png" alt="Copy to clipboard" class="h-6">
				</div>
			</button>
		</div>

	</div>
</template>

<script setup>
import { ref, computed } from 'vue'

const tabs = ['npm', 'yarn', 'pnpm', 'bun']

const selectedTab = ref('npm')
let isCopied = ref(false)

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

const copyToClipboard = async () => {
	try {
		await navigator.clipboard.writeText(installCommand.value)
		isCopied.value = true

		setTimeout(() => {
			isCopied.value = false
		}, 2000)
	} catch (err) {
		console.error('Copy failed:', err)
	}
}
</script>
