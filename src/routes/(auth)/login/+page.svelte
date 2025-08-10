<script lang="ts">
	import LoginForm from '$lib/components/auth/LoginForm.svelte'
	import { authStore } from '$lib/stores/auth.js'
	import { goto } from '$app/navigation'
	import { onMount } from 'svelte'

	onMount(() => {
		// Redirect if already authenticated
		const unsubscribe = authStore.subscribe(state => {
			if (!state.loading && state.user) {
				goto('/dashboard')
			}
		})

		return unsubscribe
	})
</script>

<svelte:head>
	<title>Sign In - TasFieldbook</title>
</svelte:head>

<div class="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
	<div class="max-w-md w-full space-y-8">
		<div class="text-center">
			<h1 class="text-3xl font-bold text-gray-900">TasFieldbook</h1>
			<p class="mt-2 text-gray-600">Digital fieldbook for Tasmanian land surveyors</p>
		</div>
		
		<LoginForm />
	</div>
</div>