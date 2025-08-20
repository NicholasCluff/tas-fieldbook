<script lang="ts">
	import { goto } from '$app/navigation'
	import { 
		ArrowLeft, 
		Settings, 
		Camera, 
		CheckCircle, 
		Clock, 
		Archive 
	} from 'lucide-svelte'
	import type { Project } from '$lib/types/database.js'

	export let project: Project | null = null
	export let title: string = ''
	export let subtitle: string = ''

	function goBack() {
		if (project?.id) {
			goto(`/projects/${project.id}`)
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

<div class="bg-white border-b border-gray-200 sticky top-0 z-10">
	<div class="px-4 py-3 sm:px-6">
		<div class="flex items-center justify-between">
			<!-- Back button and title -->
			<div class="flex items-center space-x-3 min-w-0 flex-1">
				<button
					on:click={goBack}
					class="flex-shrink-0 p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
					title="Back to project"
				>
					<ArrowLeft size={20} />
				</button>
				
				<div class="min-w-0 flex-1">
					<div class="flex items-center space-x-2">
						<h1 class="text-lg font-semibold text-gray-900 truncate sm:text-xl">
							{title}
						</h1>
						{#if project}
							<div class="hidden sm:flex space-x-2">
								<span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium {getPhaseColor(project.phase)}">
									<svelte:component this={getPhaseIcon(project.phase)} class="w-3 h-3 mr-1" />
									{project.phase}
								</span>
								<span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium {getStatusColor(project.status)}">
									<svelte:component this={getStatusIcon(project.status)} class="w-3 h-3 mr-1" />
									{project.status}
								</span>
							</div>
						{/if}
					</div>
					{#if subtitle}
						<p class="text-sm text-gray-600 truncate mt-1">{subtitle}</p>
					{:else if project}
						<p class="text-sm text-gray-600 truncate mt-1">{project.title}</p>
					{/if}
				</div>
			</div>

			<!-- Mobile badges -->
			{#if project}
				<div class="flex sm:hidden space-x-1">
					<span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium {getPhaseColor(project.phase)}">
						<svelte:component this={getPhaseIcon(project.phase)} class="w-3 h-3" />
					</span>
					<span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium {getStatusColor(project.status)}">
						<svelte:component this={getStatusIcon(project.status)} class="w-3 h-3" />
					</span>
				</div>
			{/if}
		</div>
	</div>
</div>