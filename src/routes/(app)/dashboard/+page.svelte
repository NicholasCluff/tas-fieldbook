<script lang="ts">
	import { onMount } from 'svelte'
	import { authStore } from '$lib/stores/auth.js'
	import { projectsStore, projectsManager } from '$lib/stores/projects.js'
	import { formatDate } from '$lib/utils/dates.js'
	import LoadingSpinner from '$lib/components/common/LoadingSpinner.svelte'
	import ErrorMessage from '$lib/components/common/ErrorMessage.svelte'
	import { Plus, FolderOpen, Clock, CheckCircle, Users, AlertTriangle, Archive } from 'lucide-svelte'

	onMount(() => {
		if ($authStore.profile?.id) {
			// Only load if we don't have projects or they're stale
			if ($projectsStore.projects.length === 0) {
				projectsManager.loadUserProjects($authStore.profile.id)
				projectsManager.loadProjectStats($authStore.profile.id)
			}
		}
	})

	// Get recent projects (last 5 updated)
	$: recentProjects = $projectsStore.projects.slice(0, 5)

	// Separate owned and supervised projects
	$: ownedProjects = $projectsStore.projects.filter(p => p.owner_id === $authStore.profile?.id)
	$: supervisedProjects = $projectsStore.projects.filter(p => p.supervisor_id === $authStore.profile?.id)

	// Projects needing attention
	$: needsAttention = $projectsStore.projects.filter(p => 
		p.supervision_requested && p.supervisor_id === $authStore.profile?.id
	)

	// Get stats with fallback
	$: stats = $projectsStore.stats || {
		total: 0,
		active: 0,
		completed: 0,
		archived: 0,
		setup: 0,
		fieldwork: 0,
		review: 0,
		owned: 0,
		supervised: 0
	}
</script>

<svelte:head>
	<title>Dashboard - TasFieldbook</title>
</svelte:head>

<div class="space-y-6">
	<!-- Welcome Section -->
	<div class="bg-white rounded-lg shadow p-6">
		<div class="flex items-center justify-between">
			<div>
				<h1 class="text-2xl font-bold text-gray-900">
					Welcome back, {$authStore.profile?.first_name}!
				</h1>
				<p class="text-gray-600 mt-1">
					Here's what's happening with your projects today.
				</p>
			</div>
			<a
				href="/projects/create"
				class="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center space-x-2"
			>
				<Plus size={20} />
				<span>New Project</span>
			</a>
		</div>
	</div>

	<!-- Stats Grid -->
	<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
		<div class="bg-white rounded-lg shadow p-6">
			<div class="flex items-center">
				<FolderOpen class="text-blue-600" size={24} />
				<div class="ml-4">
					<p class="text-sm font-medium text-gray-600">Active Projects</p>
					<p class="text-2xl font-semibold text-gray-900">{stats.active}</p>
				</div>
			</div>
		</div>

		<div class="bg-white rounded-lg shadow p-6">
			<div class="flex items-center">
				<CheckCircle class="text-green-600" size={24} />
				<div class="ml-4">
					<p class="text-sm font-medium text-gray-600">Completed</p>
					<p class="text-2xl font-semibold text-gray-900">{stats.completed}</p>
				</div>
			</div>
		</div>

		<div class="bg-white rounded-lg shadow p-6">
			<div class="flex items-center">
				<Clock class="text-yellow-600" size={24} />
				<div class="ml-4">
					<p class="text-sm font-medium text-gray-600">In Review</p>
					<p class="text-2xl font-semibold text-gray-900">{stats.review}</p>
				</div>
			</div>
		</div>

		<div class="bg-white rounded-lg shadow p-6">
			<div class="flex items-center">
				<Users class="text-purple-600" size={24} />
				<div class="ml-4">
					<p class="text-sm font-medium text-gray-600">Supervised</p>
					<p class="text-2xl font-semibold text-gray-900">{stats.supervised}</p>
				</div>
			</div>
		</div>
	</div>

	<!-- Supervision Alerts -->
	{#if needsAttention.length > 0}
		<div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
			<div class="flex items-start space-x-3">
				<AlertTriangle class="text-yellow-600 mt-0.5" size={20} />
				<div class="flex-1">
					<h3 class="text-sm font-medium text-yellow-800">Projects Need Your Attention</h3>
					<p class="text-sm text-yellow-700 mt-1">
						{needsAttention.length} project{needsAttention.length > 1 ? 's' : ''} requesting supervision approval.
					</p>
					<div class="mt-3 space-y-2">
						{#each needsAttention as project}
							<div class="flex items-center justify-between bg-white rounded px-3 py-2">
								<div>
									<p class="text-sm font-medium text-gray-900">{project.title}</p>
									<p class="text-xs text-gray-600">{project.location}</p>
								</div>
								<a 
									href="/projects/{project.id}"
									class="text-sm bg-yellow-100 text-yellow-800 px-2 py-1 rounded hover:bg-yellow-200"
								>
									Review
								</a>
							</div>
						{/each}
					</div>
				</div>
			</div>
		</div>
	{/if}

	<!-- Project Overview -->
	<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
		<!-- Owned Projects -->
		<div class="bg-white rounded-lg shadow">
			<div class="px-6 py-4 border-b border-gray-200">
				<h2 class="text-lg font-semibold text-gray-900">My Projects</h2>
			</div>
			<div class="px-6 py-4">
				{#if ownedProjects.length === 0}
					<p class="text-gray-500 text-sm">No owned projects yet.</p>
				{:else}
					<div class="space-y-3">
						{#each ownedProjects.slice(0, 3) as project}
							<a href="/projects/{project.id}" class="block hover:bg-gray-50 p-3 rounded">
								<div class="flex items-center justify-between">
									<div>
										<h3 class="text-sm font-medium text-gray-900">{project.title}</h3>
										<p class="text-xs text-gray-600">{project.location}</p>
									</div>
									<div class="flex items-center space-x-2">
										<span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium
											{project.phase === 'setup' ? 'bg-gray-100 text-gray-800' : 
											 project.phase === 'fieldwork' ? 'bg-blue-100 text-blue-800' : 
											 'bg-green-100 text-green-800'}">
											{project.phase}
										</span>
										<span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium
											{project.status === 'active' ? 'bg-green-100 text-green-800' : 
											 project.status === 'completed' ? 'bg-blue-100 text-blue-800' : 
											 'bg-gray-100 text-gray-800'}">
											{project.status}
										</span>
									</div>
								</div>
							</a>
						{/each}
					</div>
				{/if}
				<div class="mt-4 pt-4 border-t border-gray-200">
					<a href="/projects" class="text-sm text-blue-600 hover:text-blue-500 font-medium">
						View all owned projects →
					</a>
				</div>
			</div>
		</div>

		<!-- Supervised Projects -->
		{#if $authStore.profile?.role === 'supervisor'}
			<div class="bg-white rounded-lg shadow">
				<div class="px-6 py-4 border-b border-gray-200">
					<h2 class="text-lg font-semibold text-gray-900">Supervised Projects</h2>
				</div>
				<div class="px-6 py-4">
					{#if supervisedProjects.length === 0}
						<p class="text-gray-500 text-sm">No supervised projects yet.</p>
					{:else}
						<div class="space-y-3">
							{#each supervisedProjects.slice(0, 3) as project}
								<a href="/projects/{project.id}" class="block hover:bg-gray-50 p-3 rounded">
									<div class="flex items-center justify-between">
										<div>
											<h3 class="text-sm font-medium text-gray-900">{project.title}</h3>
											<p class="text-xs text-gray-600">{project.location}</p>
										</div>
										<div class="flex items-center space-x-2">
											{#if project.supervision_requested}
												<span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
													Pending Review
												</span>
											{/if}
											<span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium
												{project.phase === 'setup' ? 'bg-gray-100 text-gray-800' : 
												 project.phase === 'fieldwork' ? 'bg-blue-100 text-blue-800' : 
												 'bg-green-100 text-green-800'}">
												{project.phase}
											</span>
										</div>
									</div>
								</a>
							{/each}
						</div>
					{/if}
					<div class="mt-4 pt-4 border-t border-gray-200">
						<a href="/projects?filter=supervised" class="text-sm text-blue-600 hover:text-blue-500 font-medium">
							View all supervised projects →
						</a>
					</div>
				</div>
			</div>
		{/if}
	</div>

	<!-- Error Message -->
	<ErrorMessage message={$projectsStore.error} />
</div>