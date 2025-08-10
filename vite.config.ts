import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { SvelteKitPWA } from '@vite-pwa/sveltekit';

export default defineConfig({
	plugins: [
		tailwindcss(), 
		sveltekit(),
		SvelteKitPWA({
			strategies: 'generateSW',
			scope: '/',
			base: '/',
			injectRegister: 'auto',
			registerType: 'autoUpdate',
			manifest: {
				name: 'TasFieldbook',
				short_name: 'TasFieldbook',
				description: 'Digital fieldbook for Tasmanian land surveyors',
				theme_color: '#2563eb',
				background_color: '#ffffff',
				display: 'standalone',
				orientation: 'portrait-primary',
				scope: '/',
				start_url: '/',
				icons: [
					{
						src: '/favicon.svg',
						sizes: 'any',
						type: 'image/svg+xml',
						purpose: 'any maskable'
					}
				],
				categories: ['productivity', 'utilities'],
				lang: 'en',
				dir: 'ltr'
			},
			workbox: {
				globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,woff,woff2}'],
				navigateFallback: '/',
				runtimeCaching: [
					{
						urlPattern: /^https:\/\/.*\.supabase\.co\/.*$/,
						handler: 'NetworkFirst',
						options: {
							cacheName: 'supabase-cache'
						}
					}
				]
			},
			devOptions: {
				enabled: true,
				suppressWarnings: true,
				navigateFallback: '/',
				navigateFallbackAllowlist: [/^\/$/]
			}
		})
	]
});
