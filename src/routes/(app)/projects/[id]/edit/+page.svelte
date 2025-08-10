<script lang="ts">
	import { onMount } from 'svelte'
	import { page } from '$app/stores'
	import { goto } from '$app/navigation'
	import { authStore } from '$lib/stores/auth.js'
	import { projectsStore, projectsManager } from '$lib/stores/projects.js'
	import { projectsService } from '$lib/services/projects.service.js'
	import { validateRequired } from '$lib/utils/validation.js'
	import LoadingSpinner from '$lib/components/common/LoadingSpinner.svelte'
	import ErrorMessage from '$lib/components/common/ErrorMessage.svelte'
	import { ArrowLeft, Users, Search } from 'lucide-svelte'

	const projectId = $page.params.id

	onMount(() => {
		if (projectId) {
			projectsManager.loadProject(projectId)
		}
	})

	$: project = $projectsStore.currentProject
	$: isOwner = project?.owner_id === $authStore.profile?.id

	// Form state
	let title = ''
	let description = ''
	let location = ''
	let startDate = ''
	let dueDate = ''
	let supervisionRequired = false
	let supervisorId = ''

	// Supervisor search
	let supervisorSearch = ''
	let supervisors: any[] = []
	let searchingSupervisors = false

	// Form validation
	let errors: Record<string, string> = {}
	let saving = false

	// Initialize form when project loads
	$: if (project) {
		title = project.title
		description = project.description || ''
		location = project.location
		startDate = project.start_date || ''
		dueDate = project.due_date || ''
		supervisionRequired = project.supervision_required
		supervisorId = project.supervisor_id || ''
	}

	// Redirect if not owner
	$: if (project && !isOwner) {
		goto(`/projects/${projectId}`)
	}

	// Search supervisors
	async function searchSupervisors() {
		if (!supervisorSearch.trim()) {
			supervisors = []
			return
		}

		searchingSupervisors = true
		const result = await projectsService.searchSupervisors(supervisorSearch)
		searchingSupervisors = false

		if (result.data) {
			supervisors = result.data
		}
	}

	// Select supervisor
	function selectSupervisor(supervisor: any) {
		supervisorId = supervisor.id
		supervisorSearch = `${supervisor.first_name} ${supervisor.last_name}`
		supervisors = []
		supervisionRequired = true
	}

	// Clear supervisor
	function clearSupervisor() {
		supervisorId = ''
		supervisorSearch = ''
		supervisors = []
		supervisionRequired = false
	}

	// Validate form
	function validateForm() {
		errors = {}

		const titleError = validateRequired(title, 'Title')
		if (titleError) errors.title = titleError

		const locationError = validateRequired(location, 'Location')
		if (locationError) errors.location = locationError

		if (startDate && dueDate && new Date(startDate) > new Date(dueDate)) {
			errors.dueDate = 'Due date must be after start date'
		}

		return Object.keys(errors).length === 0
	}

	// Save project
	async function saveProject() {
		if (!validateForm() || !project) return

		saving = true

		const updates = {
			title,
			description: description || null,
			location,
			start_date: startDate || null,
			due_date: dueDate || null,
			supervision_required: supervisionRequired,
			supervisor_id: supervisorId || null
		}

		const result = await projectsManager.updateProject(project.id, updates)
		saving = false

		if (result.success) {
			goto(`/projects/${project.id}`)
		}
	}

	// Debounced supervisor search
	let searchTimeout: number
	$: if (supervisorSearch) {
		clearTimeout(searchTimeout)
		searchTimeout = setTimeout(searchSupervisors, 300)
	}
</script>

<svelte:head>
	<title>Edit {project?.title || 'Project'} - TasFieldbook</title>
</svelte:head>

<div class="space-y-6">
	<!-- Header -->
	<div class="flex items-center space-x-4">
		<button 
			on:click={() => goto(`/projects/${projectId}`)}
			class="p-2 text-gray-600 hover:text-gray-900"
		>
			<ArrowLeft size={20} />
		</button>
		<div>
			<h1 class="text-2xl font-bold text-gray-900">Edit Project</h1>
			<p class="text-gray-600 mt-1">Update project details and settings</p>
		</div>
	</div>

	<!-- Loading State -->
	{#if $projectsStore.loading}
		<div class="flex items-center justify-center py-12">
			<LoadingSpinner size="lg" />
		</div>
	{:else if project && isOwner}
		<form on:submit|preventDefault={saveProject} class="space-y-6">
			<!-- Project Details -->
			<div class="bg-white rounded-lg shadow">
				<div class="px-6 py-4 border-b border-gray-200">
					<h2 class="text-lg font-semibold text-gray-900">Project Details</h2>
				</div>
				<div class="px-6 py-4 space-y-4">
					<!-- Title -->
					<div>
						<label for="title" class="block text-sm font-medium text-gray-700 mb-2">
							Title *
						</label>
						<input
							type="text"
							id="title"
							bind:value={title}
							class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
							placeholder="Enter project title"
							required
						/>
						{#if errors.title}
							<p class="mt-1 text-sm text-red-600">{errors.title}</p>
						{/if}
					</div>

					<!-- Description -->
					<div>
						<label for="description" class="block text-sm font-medium text-gray-700 mb-2">
							Description
						</label>
						<textarea
							id="description"
							bind:value={description}
							rows="3"
							class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
							placeholder="Enter project description"
						></textarea>
					</div>

					<!-- Location -->
					<div>
						<label for="location" class="block text-sm font-medium text-gray-700 mb-2">
							Location *
						</label>
						<input
							type="text"
							id="location"
							bind:value={location}
							class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
							placeholder="Enter project location"
							required
						/>
						{#if errors.location}
							<p class="mt-1 text-sm text-red-600">{errors.location}</p>
						{/if}
					</div>

					<!-- Dates -->
					<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
						<div>
							<label for="startDate" class="block text-sm font-medium text-gray-700 mb-2">
								Start Date
							</label>
							<input
								type="date"
								id="startDate"
								bind:value={startDate}
								class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
							/>
						</div>
						<div>
							<label for="dueDate" class="block text-sm font-medium text-gray-700 mb-2">
								Due Date
							</label>
							<input
								type="date"
								id="dueDate"
								bind:value={dueDate}
								class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
							/>
							{#if errors.dueDate}
								<p class="mt-1 text-sm text-red-600">{errors.dueDate}</p>
							{/if}
						</div>
					</div>
				</div>
			</div>

			<!-- Supervision Settings -->
			<div class="bg-white rounded-lg shadow">
				<div class="px-6 py-4 border-b border-gray-200">
					<h2 class="text-lg font-semibold text-gray-900">Supervision Settings</h2>
				</div>
				<div class="px-6 py-4 space-y-4">
					<!-- Supervision Required -->
					<div class="flex items-center space-x-3">
						<input
							type="checkbox"
							id="supervisionRequired"
							bind:checked={supervisionRequired}
							class="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
						/>
						<label for="supervisionRequired" class="text-sm font-medium text-gray-700">
							This project requires supervision
						</label>
					</div>

					{#if supervisionRequired}
						<!-- Supervisor Search -->
						<div class="relative">
							<label for="supervisorSearch" class="block text-sm font-medium text-gray-700 mb-2">
								Supervisor
							</label>
							<div class="relative">
								<input
									type="text"
									id="supervisorSearch"
									bind:value={supervisorSearch}
									placeholder="Search for a supervisor..."
									class="w-full px-3 py-2 pl-10 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
									autocomplete="off"
								/>
								<Search class="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
								
								{#if supervisorId && supervisorSearch}
									<button
										type="button"
										on:click={clearSupervisor}
										class="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
									>
										×
									</button>
								{/if}
							</div>

							<!-- Supervisor Search Results -->
							{#if supervisors.length > 0}
								<div class="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
									{#each supervisors as supervisor}
										<button
											type="button"
											on:click={() => selectSupervisor(supervisor)}
											class="w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center space-x-3"
										>
											<Users size={16} class="text-gray-400" />
											<div>
												<p class="font-medium text-gray-900">{supervisor.first_name} {supervisor.last_name}</p>
												<p class="text-sm text-gray-600">{supervisor.email}</p>
											</div>
										</button>
									{/each}
								</div>
							{/if}

							{#if searchingSupervisors}
								<div class="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg p-4 text-center">
									<LoadingSpinner size="sm" />
									<p class="text-sm text-gray-600 mt-2">Searching supervisors...</p>
								</div>
							{/if}
						</div>
					{/if}
				</div>
			</div>

			<!-- Error Message -->
			<ErrorMessage message={$projectsStore.error} />

			<!-- Form Actions -->
			<div class="flex justify-end space-x-3">
				<button 
					type="button"
					on:click={() => goto(`/projects/${projectId}`)}
					class="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
					disabled={saving}
				>
					Cancel
				</button>
				<button 
					type="submit"
					class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
					disabled={saving}
				>
					{#if saving}
						<LoadingSpinner size="sm" />
					{:else}
						Save Changes
					{/if}
				</button>
			</div>
		</form>
	{:else}
		<div class="text-center py-12">
			<h2 class="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
			<p class="text-gray-600 mb-4">You don't have permission to edit this project.</p>
			<a href="/projects" class="text-blue-600 hover:text-blue-800">Back to Projects</a>
		</div>
	{/if}
</div>