<script setup lang="ts">
import { computed, onMounted, watch } from 'vue'
import DefaultTheme from 'vitepress/theme'
import { useRoute } from 'vitepress'

const route = useRoute()

const navbarColor = computed(() => {
	return route.path === '/'
		? 'linear-gradient(to right, #081525, #0D3348, #081525)'
		: 'transparent'
})

onMounted(() => {
	document.documentElement.style.setProperty(
		'--navbar-bg-color',
		navbarColor.value,
	)
})

// Watch for route changes to update the CSS variable dynamically
watch(route, () => {
	document.documentElement.style.setProperty(
		'--navbar-bg-color',
		navbarColor.value,
	)
})
</script>

<template>
<DefaultTheme.Layout>

 </DefaultTheme.Layout>
</template>

<style>
.VPNavBar {
  background: var(--navbar-bg-color) !important;
}
</style>
