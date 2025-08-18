<script lang="ts">
	import '../app.css';
	import { onMount } from 'svelte';
	import { authStore } from '$lib/stores/auth.js';
	import type { LayoutData } from './$types';

	let { children, data }: { children: any; data: LayoutData } = $props();

	// Initialize auth state with server-side validated data
	onMount(() => {
		// console.log('[Layout] onMount called');
		// console.log('[Layout] Server data received:', { 
		// 	hasUser: !!data.user, 
		// 	hasSession: !!data.session, 
		// 	hasProfile: !!data.profile 
		// });
		
		// Initialize the auth store with validated server data
		authStore.set({
			user: data.user,
			session: data.session,
			profile: data.profile,
			loading: false,
			error: null
		});

		// console.log('[Layout] Auth store initialized');
		
		// Initialize auth state change listener
		authStore.init();
		// console.log('[Layout] Auth listener initialized');
	});
</script>

{@render children()}
