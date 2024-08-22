<script setup lang="ts">
defineProps<{
	title: string
	description: string
	variant: 'principle' | 'feature'
	iconName?: string
}>()
</script>

<template>

  <div class="p-6 rounded-lg shadow-lg border" :class="[variant === 'principle' ? 'border-primary': 'border-secondary']">
    <div class="flex gap-2 items-center">
      <img :src="iconName" class="h-6"/>
      <h3 class="text-xl font-semibold text-gray-100">{{ title }}</h3>
    </div>
                
    <p class="mt-4 text-gray-300 text-left">{{ description }}</p>
  </div>
</template>
