import type { Theme } from 'vitepress'
import './style.css'
import DefaultTheme from 'vitepress/theme'
import Layout from './layout.vue'

export default {
	extends: DefaultTheme,
	Layout,
} satisfies Theme
