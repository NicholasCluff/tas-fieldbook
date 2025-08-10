<script lang="ts">
	import { onMount } from 'svelte'
	import { page } from '$app/stores'
	import { goto } from '$app/navigation'
	import { authStore } from '$lib/stores/auth.js'
	import { projectsStore } from '$lib/stores/projects.js'
	import { 
		Plus, 
		Calendar, 
		FileText, 
		Search, 
		Filter,
		BookOpen,
		Settings,
		Calculator,
		MapPin
	} from 'lucide-svelte'

	const projectId = $page.params.id

	$: project = $projectsStore.currentProject
	$: isOwner = project?.owner_id === $authStore.profile?.id
	$: canEdit = isOwner || project?.supervisor_id === $authStore.profile?.id

	// Mock data for development
	let recentEntries = [
		{
			id: '1',
			title: 'Site Setup and Initial Survey',
			entry_date: '2025-01-18',
			weather: 'Partly cloudy',
			hasCalculations: true,
			hasPhotos: true
		},
		{
			id: '2', 
			title: 'Boundary Survey - Eastern Section',
			entry_date: '2025-01-17',
			weather: 'Clear',
			hasCalculations: false,
			hasPhotos: true
		},
		{
			id: '3',
			title: 'Control Point Establishment', 
			entry_date: '2025-01-16',
			weather: 'Overcast',
			hasCalculations: true,
			hasPhotos: false
		}
	]

	let searchQuery = ''
	let showFilters = false

	function formatDate(dateStr: string) {
		return new Date(dateStr).toLocaleDateString('en-AU', {
			day: 'numeric',
			month: 'short'
		})
	}

	function createNewEntry() {
		goto(`/projects/${projectId}/diary/new`)
	}
</script>

<svelte:head>
	<title>Diary - {project?.title || 'Project'} - TasFieldbook</title>
</svelte:head>

<div class="flex h-screen bg-gray-50">
	<!-- Sidebar -->
	<div class="w-80 bg-white border-r border-gray-200 flex flex-col">
		<!-- Header -->
		<div class="p-4 border-b border-gray-200">
			<div class="flex items-center justify-between mb-4">
				<h1 class="text-xl font-semibold text-gray-900">Field Diary</h1>
				{#if canEdit}
					<button
						on:click={createNewEntry}
						class="inline-flex items-center px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
					>
						<Plus size={16} class="mr-1" />
						New Entry
					</button>
				{/if}
			</div>

			<!-- Search -->
			<div class="relative">
				<Search class="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
				<input
					type="text"
					placeholder="Search entries..."
					bind:value={searchQuery}
					class="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
				/>
			</div>

			<!-- Quick Actions -->
			<div class="flex gap-2 mt-3">
				<button
					on:click={() => showFilters = !showFilters}
					class="flex items-center px-3 py-1.5 text-sm text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
				>
					<Filter size={14} class="mr-1" />
					Filter
				</button>
				<a
					href="/projects/{projectId}/diary/templates"
					class="flex items-center px-3 py-1.5 text-sm text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
				>
					<BookOpen size={14} class="mr-1" />
					Templates
				</a>
			</div>

			<!-- Filters (collapsible) -->
			{#if showFilters}
				<div class="mt-3 p-3 bg-gray-50 rounded-md">
					<div class="space-y-2">
						<label class="flex items-center text-sm">
							<input type="checkbox" class="mr-2" />
							Has calculations
						</label>
						<label class="flex items-center text-sm">
							<input type="checkbox" class="mr-2" />
							Has photos
						</label>
						<label class="flex items-center text-sm">
							<input type="checkbox" class="mr-2" />
							Weather recorded
						</label>
					</div>
				</div>
			{/if}
		</div>

		<!-- Entry List -->
		<div class="flex-1 overflow-y-auto">
			{#each recentEntries as entry}
				<a
					href="/projects/{projectId}/diary/{entry.id}"
					class="block p-4 border-b border-gray-100 hover:bg-gray-50 {$page.params.entryId === entry.id ? 'bg-blue-50 border-blue-200' : ''}"
				>
					<div class="flex items-start justify-between">
						<div class="flex-1 min-w-0">
							<h3 class="font-medium text-gray-900 truncate">{entry.title}</h3>
							<div class="flex items-center mt-1 text-sm text-gray-500">
								<Calendar size={12} class="mr-1" />
								{formatDate(entry.entry_date)}
								{#if entry.weather}
									<span class="ml-2">{entry.weather}</span>
								{/if}
							</div>
						</div>
						<div class="flex items-center space-x-1 ml-2">
							{#if entry.hasCalculations}
								<Calculator size={14} class="text-blue-500" />
							{/if}
							{#if entry.hasPhotos}
								<div class="w-2 h-2 bg-green-500 rounded-full"></div>
							{/if}
						</div>
					</div>
				</a>
			{/each}
		</div>

		<!-- Footer Tools -->
		<div class="p-4 border-t border-gray-200">
			<div class="grid grid-cols-3 gap-2">
				<button class="flex flex-col items-center p-2 text-xs text-gray-600 hover:bg-gray-50 rounded">
					<Calculator size={16} class="mb-1" />
					Calculator
				</button>
				<button class="flex flex-col items-center p-2 text-xs text-gray-600 hover:bg-gray-50 rounded">
					<MapPin size={16} class="mb-1" />
					Location
				</button>
				<button class="flex flex-col items-center p-2 text-xs text-gray-600 hover:bg-gray-50 rounded">
					<Settings size={16} class="mb-1" />
					Settings
				</button>
			</div>
		</div>
	</div>

	<!-- Main Content -->
	<div class="flex-1 flex flex-col">
		<slot />
	</div>
</div>