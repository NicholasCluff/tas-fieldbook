<script lang="ts">
	import { goto } from '$app/navigation'
	import { onMount } from 'svelte'
	import { authStore } from '$lib/stores/auth.js'

	onMount(() => {
		// Simple immediate redirect based on current auth state
		const currentState = $authStore;
		
		if (!currentState.loading) {
			if (currentState.user) {
				goto('/dashboard')
			} else {
				goto('/login')
			}
		}
	})
</script>

<div class="min-h-screen flex items-center justify-center">
	<div class="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
</div>
