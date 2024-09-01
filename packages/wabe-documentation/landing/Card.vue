<script setup lang="ts">
import Chip from './Chip.vue'

defineProps<{
	title: string
	description: string
	variant: 'principle' | 'feature'
	iconName?: string
	href?: string
	isComingSoon?: boolean
}>()
</script>

<template>
  <a :href="href">
    <div class="shadow-2xl p-6 rounded-lg border" :class="[variant === 'principle' ? 'border-primary': 'border-secondary']">
      <div>
        <div class="flex gap-2 items-center">
          <img :src="iconName" class="h-6"/>
          <h3 class="text-xl font-semibold text-gray-100">{{ title }}</h3>
        </div>
                
        <p class="mt-4 text-gray-300 text-left">{{ description }}</p>
      </div>

      
      <div class="flex mt-2">
        <Chip v-if="isComingSoon" color="red">Coming Soon 🚀</Chip>
      </div>
    </div>
  </a>
</template>
