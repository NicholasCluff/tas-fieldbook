<script lang="ts">
	import { authStore, authService } from '$lib/stores/auth.js'
	import { validateEmail, validatePhone, validateRequired } from '$lib/utils/validation.js'
	import ErrorMessage from '$lib/components/common/ErrorMessage.svelte'
	import LoadingSpinner from '$lib/components/common/LoadingSpinner.svelte'

	let firstName = $authStore.profile?.first_name || ''
	let lastName = $authStore.profile?.last_name || ''
	let email = $authStore.profile?.email || ''
	let phone = $authStore.profile?.phone || ''
	let role = $authStore.profile?.role || 'candidate'

	let errors: { [key: string]: string } = {}
	let isSubmitting = false
	let successMessage = ''

	// Reactive update when profile changes
	$: if ($authStore.profile) {
		firstName = $authStore.profile.first_name
		lastName = $authStore.profile.last_name
		email = $authStore.profile.email
		phone = $authStore.profile.phone || ''
		role = $authStore.profile.role
	}

	function validateForm() {
		errors = {}

		const firstNameValidation = validateRequired(firstName, 'First name')
		if (!firstNameValidation.valid) {
			errors.firstName = firstNameValidation.message
		}

		const lastNameValidation = validateRequired(lastName, 'Last name')
		if (!lastNameValidation.valid) {
			errors.lastName = lastNameValidation.message
		}

		const emailValidation = validateRequired(email, 'Email')
		if (!emailValidation.valid) {
			errors.email = emailValidation.message
		} else if (!validateEmail(email)) {
			errors.email = 'Please enter a valid email address'
		}

		if (phone && !validatePhone(phone)) {
			errors.phone = 'Please enter a valid Australian phone number'
		}

		return Object.keys(errors).length === 0
	}

	async function handleSubmit() {
		if (!validateForm()) return

		isSubmitting = true
		successMessage = ''

		const result = await authService.updateProfile({
			first_name: firstName,
			last_name: lastName,
			email,
			phone: phone || null
		})

		if (result.success) {
			successMessage = 'Profile updated successfully'
		} else {
			errors.general = result.error || 'Failed to update profile'
		}

		isSubmitting = false
	}
</script>

<svelte:head>
	<title>Profile - TasFieldbook</title>
</svelte:head>

<div class="max-w-2xl mx-auto space-y-6">
	<!-- Header -->
	<div>
		<h1 class="text-2xl font-bold text-gray-900">Profile Settings</h1>
		<p class="text-gray-600 mt-1">Manage your account information</p>
	</div>

	<!-- Profile Form -->
	<div class="bg-white rounded-lg shadow">
		<div class="px-6 py-4 border-b border-gray-200">
			<h2 class="text-lg font-semibold text-gray-900">Personal Information</h2>
		</div>

		<form on:submit|preventDefault={handleSubmit} class="p-6 space-y-6">
			{#if successMessage}
				<div class="bg-green-50 border border-green-200 text-green-600 px-4 py-3 rounded-md">
					{successMessage}
				</div>
			{/if}

			<ErrorMessage message={errors.general} />

			<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
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
					<ErrorMessage message={errors.firstName} />
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
					<ErrorMessage message={errors.lastName} />
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
				<ErrorMessage message={errors.email} />
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
				<ErrorMessage message={errors.phone} />
			</div>

			<div>
				<label for="role" class="block text-sm font-medium text-gray-700">Role</label>
				<input
					type="text"
					id="role"
					value={role}
					class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-50 text-gray-500"
					disabled
				/>
				<p class="mt-1 text-sm text-gray-500">Contact an administrator to change your role</p>
			</div>

			<div class="flex justify-end space-x-4">
				<button
					type="button"
					class="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
					on:click={() => {
						firstName = $authStore.profile?.first_name || ''
						lastName = $authStore.profile?.last_name || ''
						email = $authStore.profile?.email || ''
						phone = $authStore.profile?.phone || ''
						errors = {}
						successMessage = ''
					}}
				>
					Cancel
				</button>
				<button
					type="submit"
					disabled={isSubmitting}
					class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
				>
					{#if isSubmitting}
						<LoadingSpinner size="sm" color="text-white" />
						<span>Saving...</span>
					{:else}
						<span>Save Changes</span>
					{/if}
				</button>
			</div>
		</form>
	</div>

	<!-- Account Information -->
	<div class="bg-white rounded-lg shadow">
		<div class="px-6 py-4 border-b border-gray-200">
			<h2 class="text-lg font-semibold text-gray-900">Account Information</h2>
		</div>

		<div class="p-6">
			<dl class="grid grid-cols-1 gap-4 sm:grid-cols-2">
				<div>
					<dt class="text-sm font-medium text-gray-500">Account Created</dt>
					<dd class="mt-1 text-sm text-gray-900">
						{$authStore.profile ? new Date($authStore.profile.created_at).toLocaleDateString() : 'N/A'}
					</dd>
				</div>
				<div>
					<dt class="text-sm font-medium text-gray-500">Last Updated</dt>
					<dd class="mt-1 text-sm text-gray-900">
						{$authStore.profile ? new Date($authStore.profile.updated_at).toLocaleDateString() : 'N/A'}
					</dd>
				</div>
				<div>
					<dt class="text-sm font-medium text-gray-500">User ID</dt>
					<dd class="mt-1 text-sm text-gray-900 font-mono">
						{$authStore.profile?.id || 'N/A'}
					</dd>
				</div>
			</dl>
		</div>
	</div>
</div>