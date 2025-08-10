<script lang="ts">
	import { onMount } from 'svelte'
	import { authStore } from '$lib/stores/auth.js'
	import { projectsStore, projectsManager } from '$lib/stores/projects.js'
	import { formatDate } from '$lib/utils/dates.js'
	import LoadingSpinner from '$lib/components/common/LoadingSpinner.svelte'
	import ErrorMessage from '$lib/components/common/ErrorMessage.svelte'
	import ProjectActions from '$lib/components/projects/ProjectActions.svelte'
	import { Plus, Search, Filter } from 'lucide-svelte'

	onMount(() => {
		if ($authStore.profile?.id) {
			projectsManager.loadUserProjects($authStore.profile.id)
		}
	})

	// Reactive projects from store
	$: projects = $projectsStore.projects

	let searchTerm = ''
	let selectedPhase = 'all'
	let selectedStatus = 'all'

	// Filter projects based on search and filters
	$: filteredProjects = projects.filter(project => {
		const matchesSearch = project.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
							 project.location.toLowerCase().includes(searchTerm.toLowerCase())
		const matchesPhase = selectedPhase === 'all' || project.phase === selectedPhase
		const matchesStatus = selectedStatus === 'all' || project.status === selectedStatus
		
		return matchesSearch && matchesPhase && matchesStatus
	})

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
</script>

<svelte:head>
	<title>Projects - TasFieldbook</title>
</svelte:head>

<div class="space-y-6">
	<!-- Header -->
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-2xl font-bold text-gray-900">Projects</h1>
			<p class="text-gray-600 mt-1">Manage your surveying projects</p>
		</div>
		<a
			href="/projects/create"
			class="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center space-x-2"
		>
			<Plus size={20} />
			<span>New Project</span>
		</a>
	</div>

	<!-- Filters -->
	<div class="bg-white rounded-lg shadow p-4">
		<div class="grid grid-cols-1 md:grid-cols-4 gap-4">
			<!-- Search -->
			<div class="relative">
				<Search class="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
				<input
					type="text"
					placeholder="Search projects..."
					bind:value={searchTerm}
					class="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
				/>
			</div>

			<!-- Phase Filter -->
			<select
				bind:value={selectedPhase}
				class="px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
			>
				<option value="all">All Phases</option>
				<option value="setup">Setup</option>
				<option value="fieldwork">Fieldwork</option>
				<option value="review">Review</option>
			</select>

			<!-- Status Filter -->
			<select
				bind:value={selectedStatus}
				class="px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
			>
				<option value="all">All Status</option>
				<option value="active">Active</option>
				<option value="completed">Completed</option>
				<option value="archived">Archived</option>
			</select>

			<!-- Filter button for mobile -->
			<button class="md:hidden flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50">
				<Filter size={20} />
				<span class="ml-2">Filter</span>
			</button>
		</div>
	</div>

	<!-- Error Message -->
	<ErrorMessage message={$projectsStore.error} />

	<!-- Loading State -->
	{#if $projectsStore.loading}
		<div class="flex items-center justify-center py-12">
			<LoadingSpinner size="lg" />
		</div>
	{:else}
		<!-- Projects Grid -->
		<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
			{#each filteredProjects as project}
				<a href="/projects/{project.id}" class="bg-white rounded-lg shadow hover:shadow-md transition-shadow">
					<div class="p-6">
						<div class="flex items-start justify-between mb-4">
							<h3 class="text-lg font-semibold text-gray-900 line-clamp-2">{project.title}</h3>
							<div class="flex space-x-2">
								<ProjectActions {project} size="sm" />
							</div>
						</div>

						<p class="text-gray-600 text-sm mb-4 line-clamp-2">{project.description || 'No description'}</p>

						<div class="space-y-2 text-sm text-gray-500">
							<div class="flex items-center justify-between">
								<span>Location:</span>
								<span class="font-medium">{project.location}</span>
							</div>
							<div class="flex items-center justify-between">
								<span>Updated:</span>
								<span>{formatDate(project.updated_at)}</span>
							</div>
							<div class="flex items-center justify-between">
								<span>Supervision:</span>
								<span class="text-xs {project.supervisor_id ? 'text-blue-600' : 'text-gray-400'}">
									{project.supervisor_id ? 'Supervised' : 'Independent'}
								</span>
							</div>
						</div>
					</div>
				</a>
			{/each}
		</div>
	{/if}

	<!-- Empty State -->
	{#if filteredProjects.length === 0}
		<div class="text-center py-12">
			<div class="text-gray-400 mb-4">
				<Plus size={48} class="mx-auto" />
			</div>
			<h3 class="text-lg font-medium text-gray-900 mb-2">No projects found</h3>
			<p class="text-gray-600 mb-4">
				{searchTerm || selectedPhase !== 'all' || selectedStatus !== 'all' 
					? 'Try adjusting your search or filters.' 
					: 'Get started by creating your first project.'}
			</p>
			<a
				href="/projects/create"
				class="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
			>
				<Plus size={20} class="mr-2" />
				Create Project
			</a>
		</div>
	{/if}
</div>