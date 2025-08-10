import adapter from '@sveltejs/adapter-vercel';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	// Consult https://svelte.dev/docs/kit/integrations
	// for more information about preprocessors
	preprocess: vitePreprocess(),
	kit: { 
		adapter: adapter({
			// Vercel adapter configuration
			runtime: 'nodejs20.x',
			regions: ['syd1'] // Sydney region for Tasmania proximity
		})
	}
};

export default config;
