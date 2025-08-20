<script lang="ts">
	import { onMount } from 'svelte'
	import { page } from '$app/stores'
	import { authStore } from '$lib/stores/auth.js'
	import { projectsStore, projectsManager } from '$lib/stores/projects.js'
	import LoadingSpinner from '$lib/components/common/LoadingSpinner.svelte'
	import ErrorMessage from '$lib/components/common/ErrorMessage.svelte'
	import MapContainer from '$lib/components/map/MapContainer.svelte'
	import MapControls from '$lib/components/map/MapControls.svelte'
	import AnnotationTools from '$lib/components/map/AnnotationTools.svelte'
	import LayerLegend from '$lib/components/map/LayerLegend.svelte'
	import ProjectHeader from '$lib/components/projects/ProjectHeader.svelte'
	import { 
		Map as MapIcon, 
		Layers, 
		Settings, 
		Info,
		Maximize2,
		Minimize2
	} from 'lucide-svelte'

	const projectId = $page.params.id

	let mapContainer: MapContainer
	let showControls = true
	let showLegend = true
	let isFullscreen = false
	let activePanel: 'layers' | 'annotations' | 'photos' | null = null

	onMount(() => {
		if (projectId) {
			projectsManager.loadProject(projectId)
		}
	})

	$: project = $projectsStore.currentProject
	$: isOwner = project?.owner_id === $authStore.profile?.id
	$: isSupervisor = project?.supervisor_id === $authStore.profile?.id
	$: canEdit = isOwner || isSupervisor

	function toggleFullscreen() {
		isFullscreen = !isFullscreen
		if (isFullscreen) {
			document.documentElement.requestFullscreen?.()
		} else {
			document.exitFullscreen?.()
		}
	}

	function togglePanel(panel: typeof activePanel) {
		activePanel = activePanel === panel ? null : panel
	}
</script>

<svelte:head>
	<title>Map - {project?.title || 'Project'} - TasFieldbook</title>
	<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
</svelte:head>

{#if $projectsStore.loading}
	<div class="flex items-center justify-center h-screen">
		<LoadingSpinner size="lg" />
	</div>
{:else if project}
	<div class="h-screen flex flex-col bg-gray-100">
		<ProjectHeader 
			{project} 
			title="Interactive Map" 
			subtitle="View and annotate maps" 
		/>
		
		<!-- Map Controls -->
		<div class="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-end">
			<div class="flex items-center space-x-2">
				<button
					on:click={() => showControls = !showControls}
					class="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-md"
					title="Toggle Controls"
				>
					<Layers class="w-5 h-5" />
				</button>
				
				<button
					on:click={() => showLegend = !showLegend}
					class="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-md"
					title="Toggle Legend"
				>
					<Info class="w-5 h-5" />
				</button>
				
				<a 
					href="/projects/{project.id}/map/settings" 
					class="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-md"
					title="Map Settings"
				>
					<Settings class="w-5 h-5" />
				</a>
				
				<button
					on:click={toggleFullscreen}
					class="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-md"
					title="Toggle Fullscreen"
				>
					{#if isFullscreen}
						<Minimize2 class="w-5 h-5" />
					{:else}
						<Maximize2 class="w-5 h-5" />
					{/if}
				</button>
			</div>
		</div>

		<!-- Main Content -->
		<div class="flex-1 flex relative">
			<!-- Left Sidebar -->
			{#if showControls}
				<div class="w-80 bg-white border-r border-gray-200 flex flex-col">
					<!-- Panel Tabs -->
					<div class="border-b border-gray-200">
						<nav class="flex">
							<button
								on:click={() => togglePanel('layers')}
								class="flex-1 py-3 px-4 text-sm font-medium border-b-2 {activePanel === 'layers' ? 'border-purple-500 text-purple-600' : 'border-transparent text-gray-500 hover:text-gray-700'}"
							>
								Layers
							</button>
							{#if canEdit}
								<button
									on:click={() => togglePanel('annotations')}
									class="flex-1 py-3 px-4 text-sm font-medium border-b-2 {activePanel === 'annotations' ? 'border-purple-500 text-purple-600' : 'border-transparent text-gray-500 hover:text-gray-700'}"
								>
									Annotations
								</button>
							{/if}
							<button
								on:click={() => togglePanel('photos')}
								class="flex-1 py-3 px-4 text-sm font-medium border-b-2 {activePanel === 'photos' ? 'border-purple-500 text-purple-600' : 'border-transparent text-gray-500 hover:text-gray-700'}"
							>
								Photos
							</button>
						</nav>
					</div>

					<!-- Panel Content -->
					<div class="flex-1 overflow-y-auto">
						{#if activePanel === 'layers'}
							<MapControls {projectId} bind:mapContainer />
						{:else if activePanel === 'annotations' && canEdit}
							<AnnotationTools {projectId} bind:mapContainer />
						{:else if activePanel === 'photos'}
							<div class="p-4">
								<h3 class="text-sm font-medium text-gray-900 mb-3">Photo Markers</h3>
								<p class="text-sm text-gray-500">Photo markers will appear here</p>
							</div>
						{:else}
							<div class="p-4">
								<p class="text-sm text-gray-500">Select a panel to view options</p>
							</div>
						{/if}
					</div>
				</div>
			{/if}

			<!-- Map Container -->
			<div class="flex-1 relative">
				<MapContainer {projectId} bind:this={mapContainer} />
				
				<!-- Map Legend -->
				{#if showLegend}
					<div class="absolute top-4 right-4 z-1000">
						<LayerLegend />
					</div>
				{/if}
			</div>
		</div>

		<!-- Error Message -->
		<ErrorMessage message={$projectsStore.error} />
	</div>
{:else}
	<div class="flex items-center justify-center h-screen">
		<div class="text-center">
			<h2 class="text-xl font-semibold text-gray-900 mb-2">Project not found</h2>
			<p class="text-gray-600 mb-4">The project you're looking for doesn't exist or you don't have access to it.</p>
			<a href="/projects" class="text-purple-600 hover:text-purple-800">Back to Projects</a>
		</div>
	</div>
{/if}

<style>
	:global(.leaflet-container) {
		height: 100%;
		width: 100%;
	}
</style>