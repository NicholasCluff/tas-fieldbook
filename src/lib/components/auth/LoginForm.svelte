<script lang="ts">
	import { authService } from '$lib/stores/auth.js'
	import { validateEmail, validateRequired } from '$lib/utils/validation.js'
	import { goto } from '$app/navigation'

	let email = ''
	let password = ''
	let errors: { [key: string]: string } = {}
	let isSubmitting = false

	function validateForm() {
		errors = {}

		const emailValidation = validateRequired(email, 'Email')
		if (!emailValidation.valid) {
			errors.email = emailValidation.message
		} else if (!validateEmail(email)) {
			errors.email = 'Please enter a valid email address'
		}

		const passwordValidation = validateRequired(password, 'Password')
		if (!passwordValidation.valid) {
			errors.password = passwordValidation.message
		}

		return Object.keys(errors).length === 0
	}

	async function handleSubmit() {
		if (!validateForm()) return

		isSubmitting = true
		const result = await authService.signIn(email, password)

		if (result.success) {
			goto('/dashboard')
		} else {
			errors.general = result.error || 'Login failed'
		}

		isSubmitting = false
	}
</script>

<div class="w-full max-w-md mx-auto">
	<form on:submit|preventDefault={handleSubmit} class="space-y-6">
		<h2 class="text-2xl font-bold text-center text-gray-900">Sign In</h2>

		{#if errors.general}
			<div class="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md">
				{errors.general}
			</div>
		{/if}

		<div>
			<label for="email" class="block text-sm font-medium text-gray-700">Email</label>
			<input
				type="email"
				id="email"
				bind:value={email}
				class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
				class:border-red-300={errors.email}
				required
			/>
			{#if errors.email}
				<p class="mt-1 text-sm text-red-600">{errors.email}</p>
			{/if}
		</div>

		<div>
			<label for="password" class="block text-sm font-medium text-gray-700">Password</label>
			<input
				type="password"
				id="password"
				bind:value={password}
				class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
				class:border-red-300={errors.password}
				required
			/>
			{#if errors.password}
				<p class="mt-1 text-sm text-red-600">{errors.password}</p>
			{/if}
		</div>

		<button
			type="submit"
			disabled={isSubmitting}
			class="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
		>
			{isSubmitting ? 'Signing In...' : 'Sign In'}
		</button>

		<div class="text-center">
			<a href="/register" class="text-sm text-blue-600 hover:text-blue-500">
				Don't have an account? Sign up
			</a>
		</div>
	</form>
</div>