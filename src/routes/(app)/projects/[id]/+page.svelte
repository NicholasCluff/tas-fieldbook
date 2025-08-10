<script lang="ts">
	import { onMount } from 'svelte'
	import { page } from '$app/stores'
	import { goto } from '$app/navigation'
	import { authStore } from '$lib/stores/auth.js'
	import { projectsStore, projectsManager } from '$lib/stores/projects.js'
	import { formatDate } from '$lib/utils/dates.js'
	import LoadingSpinner from '$lib/components/common/LoadingSpinner.svelte'
	import ErrorMessage from '$lib/components/common/ErrorMessage.svelte'
	import { 
		Edit3, 
		Trash2, 
		Users, 
		Calendar, 
		MapPin, 
		AlertCircle,
		CheckCircle,
		Clock,
		Archive,
		FileText,
		Camera,
		Map,
		Settings
	} from 'lucide-svelte'

	const projectId = $page.params.id

	onMount(() => {
		if (projectId) {
			projectsManager.loadProject(projectId)
		}
	})

	$: project = $projectsStore.currentProject
	$: isOwner = project?.owner_id === $authStore.profile?.id
	$: isSupervisor = project?.supervisor_id === $authStore.profile?.id

	let showDeleteModal = false
	let deleting = false

	// Phase and status management
	async function updatePhase(newPhase: 'setup' | 'fieldwork' | 'review') {
		if (!project) return
		
		const result = await projectsManager.updateProjectPhase(project.id, newPhase)
		if (result.success) {
			// Show success message or toast
		}
	}

	async function updateStatus(newStatus: 'active' | 'completed' | 'archived') {
		if (!project) return
		
		const result = await projectsManager.updateProjectStatus(project.id, newStatus)
		if (result.success) {
			// Show success message or toast
		}
	}

	// Delete project
	async function deleteProject() {
		if (!project) return
		
		deleting = true
		const result = await projectsManager.deleteProject(project.id)
		deleting = false
		
		if (result.success) {
			goto('/projects')
		}
	}

	function getPhaseColor(phase: string) {
		switch (phase) {
			case 'setup': return 'bg-gray-100 text-gray-800'
			case 'fieldwork': return 'bg-blue-100 text-blue-800'
			case 'review': return 'bg-green-100 text-green-800'
			default: return 'bg-gray-100 text-gray-800'
		}
	}

	function getStatusColor(status: string) {
		switch (status) {
			case 'active': return 'bg-green-100 text-green-800'
			case 'completed': return 'bg-blue-100 text-blue-800'
			case 'archived': return 'bg-gray-100 text-gray-800'
			default: return 'bg-gray-100 text-gray-800'
		}
	}

	function getPhaseIcon(phase: string) {
		switch (phase) {
			case 'setup': return Settings
			case 'fieldwork': return Camera
			case 'review': return CheckCircle
			default: return Clock
		}
	}

	function getStatusIcon(status: string) {
		switch (status) {
			case 'active': return CheckCircle
			case 'completed': return CheckCircle
			case 'archived': return Archive
			default: return Clock
		}
	}
</script>

<svelte:head>
	<title>{project?.title || 'Project'} - TasFieldbook</title>
</svelte:head>

<div class="space-y-6">
	<!-- Loading State -->
	{#if $projectsStore.loading}
		<div class="flex items-center justify-center py-12">
			<LoadingSpinner size="lg" />
		</div>
	{:else if project}
		<!-- Header -->
		<div class="bg-white rounded-lg shadow">
			<div class="px-6 py-4 border-b border-gray-200">
				<div class="flex items-center justify-between">
					<div class="flex items-center space-x-4">
						<div>
							<h1 class="text-2xl font-bold text-gray-900">{project.title}</h1>
							<p class="text-gray-600 mt-1">{project.description || 'No description'}</p>
						</div>
						<div class="flex space-x-2">
							<span class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium {getPhaseColor(project.phase)}">
								<svelte:component this={getPhaseIcon(project.phase)} class="w-4 h-4 mr-1" />
								{project.phase}
							</span>
							<span class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium {getStatusColor(project.status)}">
								<svelte:component this={getStatusIcon(project.status)} class="w-4 h-4 mr-1" />
								{project.status}
							</span>
						</div>
					</div>
					
					{#if isOwner}
						<div class="flex space-x-2">
							<a 
								href="/projects/{project.id}/edit" 
								class="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50"
							>
								<Edit3 size={16} class="mr-2" />
								Edit
							</a>
							<button 
								on:click={() => showDeleteModal = true}
								class="inline-flex items-center px-4 py-2 border border-red-300 rounded-md text-red-700 bg-white hover:bg-red-50"
							>
								<Trash2 size={16} class="mr-2" />
								Delete
							</button>
						</div>
					{/if}
				</div>
			</div>

			<!-- Project Details -->
			<div class="px-6 py-4">
				<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
					<div class="space-y-4">
						<div class="flex items-center space-x-3">
							<MapPin class="w-5 h-5 text-gray-400" />
							<div>
								<p class="text-sm text-gray-500">Location</p>
								<p class="font-medium">{project.location}</p>
							</div>
						</div>

						<div class="flex items-center space-x-3">
							<Calendar class="w-5 h-5 text-gray-400" />
							<div>
								<p class="text-sm text-gray-500">Start Date</p>
								<p class="font-medium">{project.start_date ? formatDate(project.start_date) : 'Not set'}</p>
							</div>
						</div>

						<div class="flex items-center space-x-3">
							<AlertCircle class="w-5 h-5 text-gray-400" />
							<div>
								<p class="text-sm text-gray-500">Due Date</p>
								<p class="font-medium">{project.due_date ? formatDate(project.due_date) : 'Not set'}</p>
							</div>
						</div>
					</div>

					<div class="space-y-4">
						<div class="flex items-center space-x-3">
							<Users class="w-5 h-5 text-gray-400" />
							<div>
								<p class="text-sm text-gray-500">Supervision</p>
								<p class="font-medium">
									{project.supervisor_id ? 'Supervised' : 'Independent'}
									{project.supervision_requested && !project.supervisor_id ? ' (Requested)' : ''}
								</p>
							</div>
						</div>

						<div class="flex items-center space-x-3">
							<Clock class="w-5 h-5 text-gray-400" />
							<div>
								<p class="text-sm text-gray-500">Created</p>
								<p class="font-medium">{formatDate(project.created_at)}</p>
							</div>
						</div>

						<div class="flex items-center space-x-3">
							<Clock class="w-5 h-5 text-gray-400" />
							<div>
								<p class="text-sm text-gray-500">Last Updated</p>
								<p class="font-medium">{formatDate(project.updated_at)}</p>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>

		<!-- Project Features -->
		<div class="bg-white rounded-lg shadow">
			<div class="px-6 py-4 border-b border-gray-200">
				<h2 class="text-lg font-semibold text-gray-900">Project Features</h2>
			</div>
			<div class="px-6 py-4">
				<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
					<a 
						href="/projects/{project.id}/search" 
						class="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
					>
						<FileText class="w-8 h-8 text-blue-500 mr-3" />
						<div>
							<p class="font-medium text-gray-900">Search Analysis</p>
							<p class="text-sm text-gray-500">Upload and review documents</p>
						</div>
					</a>

					<a 
						href="/projects/{project.id}/diary" 
						class="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
					>
						<Edit3 class="w-8 h-8 text-green-500 mr-3" />
						<div>
							<p class="font-medium text-gray-900">Digital Diary</p>
							<p class="text-sm text-gray-500">Record daily entries</p>
						</div>
					</a>

					<a 
						href="/projects/{project.id}/map" 
						class="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
					>
						<Map class="w-8 h-8 text-purple-500 mr-3" />
						<div>
							<p class="font-medium text-gray-900">Interactive Map</p>
							<p class="text-sm text-gray-500">View and annotate maps</p>
						</div>
					</a>

					<a 
						href="/projects/{project.id}/photos" 
						class="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
					>
						<Camera class="w-8 h-8 text-orange-500 mr-3" />
						<div>
							<p class="font-medium text-gray-900">Photo Gallery</p>
							<p class="text-sm text-gray-500">Manage project photos</p>
						</div>
					</a>
				</div>
			</div>
		</div>
		
		<!-- Phase Management -->
		{#if isOwner || isSupervisor}
			<div class="bg-white rounded-lg shadow">
				<div class="px-6 py-4 border-b border-gray-200">
					<h2 class="text-lg font-semibold text-gray-900">Project Workflow</h2>
				</div>
				<div class="px-6 py-4">
					<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
						<!-- Phase Management -->
						<div>
							<h3 class="text-sm font-medium text-gray-700 mb-3">Phase</h3>
							<div class="space-y-2">
								{#each ['setup', 'fieldwork', 'review'] as phase}
									<button
										on:click={() => updatePhase(phase)}
										class="w-full flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 {project.phase === phase ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}"
									>
										<div class="flex items-center space-x-3">
											<svelte:component this={getPhaseIcon(phase)} class="w-5 h-5 text-gray-400" />
											<span class="font-medium capitalize">{phase}</span>
										</div>
										{#if project.phase === phase}
											<CheckCircle class="w-5 h-5 text-blue-500" />
										{/if}
									</button>
								{/each}
							</div>
						</div>

						<!-- Status Management -->
						<div>
							<h3 class="text-sm font-medium text-gray-700 mb-3">Status</h3>
							<div class="space-y-2">
								{#each ['active', 'completed', 'archived'] as status}
									<button
										on:click={() => updateStatus(status)}
										class="w-full flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 {project.status === status ? 'border-green-500 bg-green-50' : 'border-gray-200'}"
									>
										<div class="flex items-center space-x-3">
											<svelte:component this={getStatusIcon(status)} class="w-5 h-5 text-gray-400" />
											<span class="font-medium capitalize">{status}</span>
										</div>
										{#if project.status === status}
											<CheckCircle class="w-5 h-5 text-green-500" />
										{/if}
									</button>
								{/each}
							</div>
						</div>
					</div>
				</div>
			</div>
		{/if}


		<!-- Error Message -->
		<ErrorMessage message={$projectsStore.error} />

		<!-- Delete Confirmation Modal -->
		{#if showDeleteModal}
			<div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
				<div class="bg-white rounded-lg p-6 max-w-md w-full mx-4">
					<h3 class="text-lg font-semibold text-gray-900 mb-4">Delete Project</h3>
					<p class="text-gray-600 mb-6">
						Are you sure you want to delete "{project.title}"? This action cannot be undone.
					</p>
					<div class="flex justify-end space-x-3">
						<button 
							on:click={() => showDeleteModal = false}
							class="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
							disabled={deleting}
						>
							Cancel
						</button>
						<button 
							on:click={deleteProject}
							class="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
							disabled={deleting}
						>
							{#if deleting}
								<LoadingSpinner size="sm" />
							{:else}
								Delete
							{/if}
						</button>
					</div>
				</div>
			</div>
		{/if}
	{:else}
		<div class="text-center py-12">
			<h2 class="text-xl font-semibold text-gray-900 mb-2">Project not found</h2>
			<p class="text-gray-600 mb-4">The project you're looking for doesn't exist or you don't have access to it.</p>
			<a href="/projects" class="text-blue-600 hover:text-blue-800">Back to Projects</a>
		</div>
	{/if}
</div>