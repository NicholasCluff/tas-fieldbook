<script lang="ts">
	import { createEventDispatcher } from 'svelte'
	import { authStore } from '$lib/stores/auth.js'
	import { projectsService } from '$lib/services/projects.service.js'
	import { validateProjectTitle, validateLocation, validateRequired } from '$lib/utils/validation.js'
	import { formatDateForInput } from '$lib/utils/dates.js'
	import ErrorMessage from '$lib/components/common/ErrorMessage.svelte'
	import LoadingSpinner from '$lib/components/common/LoadingSpinner.svelte'
	import { Search, X } from 'lucide-svelte'

	const dispatch = createEventDispatcher()

	export let project: any = null // For editing existing projects
	export let isEditing = false

	// Form fields
	let title = project?.title || ''
	let description = project?.description || ''
	let location = project?.location || ''
	let startDate = project?.start_date ? formatDateForInput(project.start_date) : ''
	let dueDate = project?.due_date ? formatDateForInput(project.due_date) : ''
	let supervisionRequired = project?.supervision_required || false
	let selectedSupervisor = project?.supervisor || null

	// Supervisor search
	let supervisorSearch = ''
	let supervisors: any[] = []
	let showSupervisorSearch = false
	let searchingSupervisors = false

	// Form state
	let errors: { [key: string]: string } = {}
	let isSubmitting = false
	let generalError = ''

	// Search for supervisors
	async function searchSupervisors() {
		if (!supervisorSearch.trim()) {
			supervisors = []
			return
		}

		searchingSupervisors = true
		const result = await projectsService.searchSupervisors(supervisorSearch)
		
		if (result.error) {
			// Error searching supervisors
		} else {
			supervisors = result.data || []
		}
		
		searchingSupervisors = false
	}

	// Handle supervisor selection
	function selectSupervisor(supervisor: any) {
		selectedSupervisor = supervisor
		showSupervisorSearch = false
		supervisorSearch = ''
		supervisors = []
		supervisionRequired = true
	}

	// Remove selected supervisor
	function removeSupervisor() {
		selectedSupervisor = null
		supervisionRequired = false
	}

	// Validate form
	function validateForm() {
		errors = {}

		const titleValidation = validateProjectTitle(title)
		if (!titleValidation.valid) {
			errors.title = titleValidation.message
		}

		const locationValidation = validateLocation(location)
		if (!locationValidation.valid) {
			errors.location = locationValidation.message
		}

		if (startDate && dueDate && new Date(startDate) > new Date(dueDate)) {
			errors.dueDate = 'Due date must be after start date'
		}

		if (supervisionRequired && !selectedSupervisor) {
			errors.supervisor = 'Please select a supervisor'
		}

		return Object.keys(errors).length === 0
	}

	// Handle form submission
	async function handleSubmit() {
		if (!validateForm()) return

		isSubmitting = true
		generalError = ''

		try {
			const projectData = {
				title: title.trim(),
				description: description.trim() || null,
				location: location.trim(),
				owner_id: $authStore.profile!.id,
				supervisor_id: selectedSupervisor?.id || null,
				supervision_required: supervisionRequired,
				supervision_requested: supervisionRequired && selectedSupervisor,
				start_date: startDate || null,
				due_date: dueDate || null
			}

			if (isEditing && project) {
				// Update existing project
				const result = await projectsService.updateProject(project.id, projectData)
				
				if (result.error) {
					generalError = result.error.message || 'Failed to update project'
				} else {
					dispatch('success', { project: result.data, action: 'updated' })
				}
			} else {
				// Create new project
				const result = await projectsService.createProject(projectData)
				
				if (result.error) {
					generalError = result.error.message || 'Failed to create project'
				} else {
					dispatch('success', { project: result.data, action: 'created' })
				}
			}
		} catch (error) {
			generalError = 'An unexpected error occurred'
		}

		isSubmitting = false
	}

	// Handle cancel
	function handleCancel() {
		dispatch('cancel')
	}

	// Reactive search for supervisors
	$: if (supervisorSearch.length > 2) {
		searchSupervisors()
	} else {
		supervisors = []
	}
</script>

<form on:submit|preventDefault={handleSubmit} class="space-y-6">
	<div class="bg-white rounded-lg shadow p-6">
		<h2 class="text-lg font-semibold text-gray-900 mb-6">
			{isEditing ? 'Edit Project' : 'Create New Project'}
		</h2>

		<ErrorMessage message={generalError} />

		<div class="grid grid-cols-1 gap-6">
			<!-- Project Title -->
			<div>
				<label for="title" class="block text-sm font-medium text-gray-700">Project Title</label>
				<input
					type="text"
					id="title"
					bind:value={title}
					class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
					class:border-red-300={errors.title}
					required
					placeholder="e.g., Hobart Subdivision Survey"
				/>
				<ErrorMessage message={errors.title} />
			</div>

			<!-- Description -->
			<div>
				<label for="description" class="block text-sm font-medium text-gray-700">Description (optional)</label>
				<textarea
					id="description"
					bind:value={description}
					rows="3"
					class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
					placeholder="Brief description of the project..."
				></textarea>
			</div>

			<!-- Location -->
			<div>
				<label for="location" class="block text-sm font-medium text-gray-700">Location</label>
				<input
					type="text"
					id="location"
					bind:value={location}
					class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
					class:border-red-300={errors.location}
					required
					placeholder="e.g., Sandy Bay, TAS"
				/>
				<ErrorMessage message={errors.location} />
			</div>

			<!-- Dates -->
			<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
				<div>
					<label for="startDate" class="block text-sm font-medium text-gray-700">Start Date (optional)</label>
					<input
						type="date"
						id="startDate"
						bind:value={startDate}
						class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
					/>
				</div>
				<div>
					<label for="dueDate" class="block text-sm font-medium text-gray-700">Due Date (optional)</label>
					<input
						type="date"
						id="dueDate"
						bind:value={dueDate}
						class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
						class:border-red-300={errors.dueDate}
					/>
					<ErrorMessage message={errors.dueDate} />
				</div>
			</div>

			<!-- Supervision -->
			<div class="space-y-4">
				<div class="flex items-center">
					<input
						type="checkbox"
						id="supervisionRequired"
						bind:checked={supervisionRequired}
						class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
					/>
					<label for="supervisionRequired" class="ml-2 block text-sm text-gray-900">
						This project requires supervision
					</label>
				</div>

				{#if supervisionRequired}
					<div class="ml-6 space-y-3">
						{#if selectedSupervisor}
							<!-- Selected Supervisor -->
							<div class="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-md">
								<div>
									<p class="text-sm font-medium text-blue-900">
										{selectedSupervisor.first_name} {selectedSupervisor.last_name}
									</p>
									<p class="text-sm text-blue-600">{selectedSupervisor.email}</p>
								</div>
								<button
									type="button"
									on:click={removeSupervisor}
									class="text-blue-600 hover:text-blue-800"
								>
									<X size={20} />
								</button>
							</div>
						{:else}
							<!-- Supervisor Search -->
							<div class="relative">
								<label class="block text-sm font-medium text-gray-700 mb-2">Select Supervisor</label>
								<div class="relative">
									<Search class="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
									<input
										type="text"
										bind:value={supervisorSearch}
										on:focus={() => showSupervisorSearch = true}
										class="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
										class:border-red-300={errors.supervisor}
										placeholder="Search for a supervisor..."
									/>
								</div>
								<ErrorMessage message={errors.supervisor} />

								<!-- Search Results -->
								{#if showSupervisorSearch && (supervisors.length > 0 || searchingSupervisors)}
									<div class="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
										{#if searchingSupervisors}
											<div class="p-3 flex items-center justify-center">
												<LoadingSpinner size="sm" />
												<span class="ml-2 text-sm text-gray-600">Searching...</span>
											</div>
										{:else if supervisors.length === 0 && supervisorSearch.length > 2}
											<div class="p-3 text-sm text-gray-500">No supervisors found</div>
										{:else}
											{#each supervisors as supervisor}
												<button
													type="button"
													on:click={() => selectSupervisor(supervisor)}
													class="w-full text-left p-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
												>
													<p class="text-sm font-medium text-gray-900">
														{supervisor.first_name} {supervisor.last_name}
													</p>
													<p class="text-sm text-gray-600">{supervisor.email}</p>
												</button>
											{/each}
										{/if}
									</div>
								{/if}
							</div>
						{/if}
					</div>
				{/if}
			</div>
		</div>

		<!-- Form Actions -->
		<div class="flex justify-end space-x-4 mt-8 pt-6 border-t border-gray-200">
			<button
				type="button"
				on:click={handleCancel}
				class="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
			>
				Cancel
			</button>
			<button
				type="submit"
				disabled={isSubmitting}
				class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
			>
				{#if isSubmitting}
					<LoadingSpinner size="sm" color="text-white" />
					<span>{isEditing ? 'Updating...' : 'Creating...'}</span>
				{:else}
					<span>{isEditing ? 'Update Project' : 'Create Project'}</span>
				{/if}
			</button>
		</div>
	</div>
</form>

<!-- Close dropdown when clicking outside -->
<svelte:window on:click={() => showSupervisorSearch = false} />