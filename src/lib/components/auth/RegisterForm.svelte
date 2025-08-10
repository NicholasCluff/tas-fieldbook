<script lang="ts">
	import { authService } from '$lib/stores/auth.js'
	import { validateEmail, validatePassword, validatePhone, validateRequired } from '$lib/utils/validation.js'
	import { goto } from '$app/navigation'

	let email = ''
	let password = ''
	let confirmPassword = ''
	let firstName = ''
	let lastName = ''
	let role: 'supervisor' | 'candidate' = 'candidate'
	let phone = ''
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

		const passwordValidation = validatePassword(password)
		if (!passwordValidation.valid) {
			errors.password = passwordValidation.message
		}

		if (password !== confirmPassword) {
			errors.confirmPassword = 'Passwords do not match'
		}

		const firstNameValidation = validateRequired(firstName, 'First name')
		if (!firstNameValidation.valid) {
			errors.firstName = firstNameValidation.message
		}

		const lastNameValidation = validateRequired(lastName, 'Last name')
		if (!lastNameValidation.valid) {
			errors.lastName = lastNameValidation.message
		}

		if (phone && !validatePhone(phone)) {
			errors.phone = 'Please enter a valid Australian phone number'
		}

		return Object.keys(errors).length === 0
	}

	async function handleSubmit() {
		if (!validateForm()) return

		isSubmitting = true
		const result = await authService.signUp(
			email,
			password,
			firstName,
			lastName,
			role,
			phone || undefined
		)

		if (result.success) {
			goto('/dashboard')
		} else {
			errors.general = result.error || 'Registration failed'
		}

		isSubmitting = false
	}
</script>

<div class="w-full max-w-md mx-auto">
	<form on:submit|preventDefault={handleSubmit} class="space-y-6">
		<h2 class="text-2xl font-bold text-center text-gray-900">Create Account</h2>

		{#if errors.general}
			<div class="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md">
				{errors.general}
			</div>
		{/if}

		<div class="grid grid-cols-2 gap-4">
			<div>
				<label for="firstName" class="block text-sm font-medium text-gray-700">First Name</label>
				<input
					type="text"
					id="firstName"
					bind:value={firstName}
					class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
					class:border-red-300={errors.firstName}
					required
				/>
				{#if errors.firstName}
					<p class="mt-1 text-sm text-red-600">{errors.firstName}</p>
				{/if}
			</div>

			<div>
				<label for="lastName" class="block text-sm font-medium text-gray-700">Last Name</label>
				<input
					type="text"
					id="lastName"
					bind:value={lastName}
					class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
					class:border-red-300={errors.lastName}
					required
				/>
				{#if errors.lastName}
					<p class="mt-1 text-sm text-red-600">{errors.lastName}</p>
				{/if}
			</div>
		</div>

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
			<label for="phone" class="block text-sm font-medium text-gray-700">Phone (optional)</label>
			<input
				type="tel"
				id="phone"
				bind:value={phone}
				placeholder="0412 345 678"
				class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
				class:border-red-300={errors.phone}
			/>
			{#if errors.phone}
				<p class="mt-1 text-sm text-red-600">{errors.phone}</p>
			{/if}
		</div>

		<div>
			<label for="role" class="block text-sm font-medium text-gray-700">Role</label>
			<select
				id="role"
				bind:value={role}
				class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
			>
				<option value="candidate">Candidate</option>
				<option value="supervisor">Supervisor</option>
			</select>
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

		<div>
			<label for="confirmPassword" class="block text-sm font-medium text-gray-700">Confirm Password</label>
			<input
				type="password"
				id="confirmPassword"
				bind:value={confirmPassword}
				class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
				class:border-red-300={errors.confirmPassword}
				required
			/>
			{#if errors.confirmPassword}
				<p class="mt-1 text-sm text-red-600">{errors.confirmPassword}</p>
			{/if}
		</div>

		<button
			type="submit"
			disabled={isSubmitting}
			class="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
		>
			{isSubmitting ? 'Creating Account...' : 'Create Account'}
		</button>

		<div class="text-center">
			<a href="/login" class="text-sm text-blue-600 hover:text-blue-500">
				Already have an account? Sign in
			</a>
		</div>
	</form>
</div>