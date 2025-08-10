<script lang="ts">
	import Header from '$lib/components/common/Header.svelte'
	import LoadingSpinner from '$lib/components/common/LoadingSpinner.svelte'
	import ToastContainer from '$lib/components/common/ToastContainer.svelte'
	import { authStore, authService } from '$lib/stores/auth.js'
	import { goto } from '$app/navigation'
	import { onMount } from 'svelte'

	let { children } = $props()

	onMount(() => {
		const unsubscribe = authStore.subscribe(state => {
			// Only redirect if we're not loading and definitely no user
			if (!state.loading && !state.user && !state.error) {
				goto('/login')
			}
		})

		return unsubscribe
	})
</script>

{#if $authStore.loading}
	<div class="min-h-screen flex items-center justify-center bg-gray-50">
		<div class="text-center">
			<LoadingSpinner size="lg" />
			<p class="mt-4 text-gray-600">Loading your profile...</p>
		</div>
	</div>
{:else if $authStore.user && $authStore.profile}
	<div class="min-h-screen bg-gray-50">
		<Header />
		
		<main class="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
			{@render children()}
		</main>
		
		<ToastContainer />
	</div>
{:else if $authStore.error}
	<div class="min-h-screen flex items-center justify-center bg-gray-50">
		<div class="text-center bg-white p-6 rounded-lg shadow-sm max-w-md">
			<div class="text-red-600 mb-4">
				<svg class="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
				</svg>
				<p class="text-sm">{$authStore.error}</p>
			</div>
			<div class="space-x-2">
				<button 
					onclick={() => authService.forceProfileRefresh()}
					class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
				>
					Retry Loading
				</button>
				<button 
					onclick={() => window.location.reload()}
					class="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 text-sm"
				>
					Refresh Page
				</button>
			</div>
		</div>
	</div>
{:else}
	<!-- Redirecting to login -->
	<div class="min-h-screen flex items-center justify-center bg-gray-50">
		<div class="text-center">
			<LoadingSpinner size="lg" />
			<p class="mt-4 text-gray-600">Redirecting to login...</p>
		</div>
	</div>
{/if}