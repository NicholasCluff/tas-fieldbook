<script lang="ts">
	import { projectsManager } from '$lib/stores/projects.js'
	import { authStore } from '$lib/stores/auth.js'
	import type { Project } from '$lib/types/database.js'
	import { ChevronDown, Settings, Camera, CheckCircle, Archive, Play, Pause } from 'lucide-svelte'

	export let project: Project
	export let size: 'sm' | 'md' | 'lg' = 'md'

	$: isOwner = project.owner_id === $authStore.profile?.id
	$: isSupervisor = project.supervisor_id === $authStore.profile?.id
	$: canEdit = isOwner || isSupervisor

	let showPhaseMenu = false
	let showStatusMenu = false
	let updating = false

	const phases = [
		{ value: 'setup', label: 'Setup', icon: Settings, color: 'gray' },
		{ value: 'fieldwork', label: 'Fieldwork', icon: Camera, color: 'blue' },
		{ value: 'review', label: 'Review', icon: CheckCircle, color: 'green' }
	]

	const statuses = [
		{ value: 'active', label: 'Active', icon: Play, color: 'green' },
		{ value: 'completed', label: 'Completed', icon: CheckCircle, color: 'blue' },
		{ value: 'archived', label: 'Archived', icon: Archive, color: 'gray' }
	]

	async function updatePhase(newPhase: 'setup' | 'fieldwork' | 'review') {
		if (updating || !canEdit) return

		updating = true
		await projectsManager.updateProjectPhase(project.id, newPhase)
		updating = false
		showPhaseMenu = false
	}

	async function updateStatus(newStatus: 'active' | 'completed' | 'archived') {
		if (updating || !canEdit) return

		updating = true
		await projectsManager.updateProjectStatus(project.id, newStatus)
		updating = false
		showStatusMenu = false
	}

	function getPhaseInfo(phase: string) {
		return phases.find(p => p.value === phase) || phases[0]
	}

	function getStatusInfo(status: string) {
		return statuses.find(s => s.value === status) || statuses[0]
	}

	function getColorClasses(color: string, variant: 'badge' | 'button' = 'badge') {
		const colorMap = {
			gray: variant === 'badge' ? 'bg-gray-100 text-gray-800' : 'text-gray-700 hover:bg-gray-50',
			blue: variant === 'badge' ? 'bg-blue-100 text-blue-800' : 'text-blue-700 hover:bg-blue-50',
			green: variant === 'badge' ? 'bg-green-100 text-green-800' : 'text-green-700 hover:bg-green-50',
			red: variant === 'badge' ? 'bg-red-100 text-red-800' : 'text-red-700 hover:bg-red-50'
		}
		return colorMap[color] || colorMap.gray
	}

	function getSizeClasses() {
		switch (size) {
			case 'sm':
				return {
					button: 'px-2 py-1 text-xs',
					badge: 'px-2 py-0.5 text-xs',
					icon: 'w-3 h-3'
				}
			case 'lg':
				return {
					button: 'px-4 py-2 text-base',
					badge: 'px-3 py-1 text-sm',
					icon: 'w-5 h-5'
				}
			default:
				return {
					button: 'px-3 py-1.5 text-sm',
					badge: 'px-2.5 py-0.5 text-xs',
					icon: 'w-4 h-4'
				}
		}
	}

	$: sizeClasses = getSizeClasses()
	$: currentPhase = getPhaseInfo(project.phase)
	$: currentStatus = getStatusInfo(project.status)
</script>

<div class="flex items-center space-x-2">
	<!-- Phase Dropdown -->
	<div class="relative">
		{#if canEdit}
			<button
				on:click|stopPropagation={() => showPhaseMenu = !showPhaseMenu}
				class="inline-flex items-center {sizeClasses.button} border border-gray-300 rounded-md {getColorClasses(currentPhase.color, 'button')} font-medium disabled:opacity-50"
				disabled={updating}
			>
				<svelte:component this={currentPhase.icon} class="{sizeClasses.icon} mr-1" />
				{currentPhase.label}
				<ChevronDown class="{sizeClasses.icon} ml-1" />
			</button>
		{:else}
			<span class="inline-flex items-center {sizeClasses.badge} rounded-full font-medium {getColorClasses(currentPhase.color)}">
				<svelte:component this={currentPhase.icon} class="{sizeClasses.icon} mr-1" />
				{currentPhase.label}
			</span>
		{/if}

		{#if showPhaseMenu && canEdit}
			<div class="absolute z-10 mt-1 bg-white border border-gray-200 rounded-md shadow-lg">
				{#each phases as phase}
					<button
						on:click|stopPropagation={() => updatePhase(phase.value)}
						class="block w-full text-left px-4 py-2 text-sm hover:bg-gray-50 {project.phase === phase.value ? 'bg-gray-50 font-medium' : ''}"
						disabled={updating}
					>
						<div class="flex items-center space-x-2">
							<svelte:component this={phase.icon} class="w-4 h-4 text-gray-400" />
							<span>{phase.label}</span>
						</div>
					</button>
				{/each}
			</div>
		{/if}
	</div>

	<!-- Status Dropdown -->
	<div class="relative">
		{#if canEdit}
			<button
				on:click|stopPropagation={() => showStatusMenu = !showStatusMenu}
				class="inline-flex items-center {sizeClasses.button} border border-gray-300 rounded-md {getColorClasses(currentStatus.color, 'button')} font-medium disabled:opacity-50"
				disabled={updating}
			>
				<svelte:component this={currentStatus.icon} class="{sizeClasses.icon} mr-1" />
				{currentStatus.label}
				<ChevronDown class="{sizeClasses.icon} ml-1" />
			</button>
		{:else}
			<span class="inline-flex items-center {sizeClasses.badge} rounded-full font-medium {getColorClasses(currentStatus.color)}">
				<svelte:component this={currentStatus.icon} class="{sizeClasses.icon} mr-1" />
				{currentStatus.label}
			</span>
		{/if}

		{#if showStatusMenu && canEdit}
			<div class="absolute z-10 mt-1 bg-white border border-gray-200 rounded-md shadow-lg">
				{#each statuses as status}
					<button
						on:click|stopPropagation={() => updateStatus(status.value)}
						class="block w-full text-left px-4 py-2 text-sm hover:bg-gray-50 {project.status === status.value ? 'bg-gray-50 font-medium' : ''}"
						disabled={updating}
					>
						<div class="flex items-center space-x-2">
							<svelte:component this={status.icon} class="w-4 h-4 text-gray-400" />
							<span>{status.label}</span>
						</div>
					</button>
				{/each}
			</div>
		{/if}
	</div>
</div>

<!-- Click outside to close menus -->
<svelte:window on:click={() => { showPhaseMenu = false; showStatusMenu = false; }} />