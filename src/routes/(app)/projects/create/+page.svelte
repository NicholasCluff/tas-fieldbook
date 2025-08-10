<script lang="ts">
	import { goto } from '$app/navigation'
	import ProjectForm from '$lib/components/projects/ProjectForm.svelte'
	import { ArrowLeft } from 'lucide-svelte'

	function handleSuccess(event: CustomEvent) {
		const { project } = event.detail
		goto(`/projects/${project.id}`)
	}

	function handleCancel() {
		goto('/projects')
	}
</script>

<svelte:head>
	<title>Create Project - TasFieldbook</title>
</svelte:head>

<div class="space-y-6">
	<!-- Header -->
	<div class="flex items-center space-x-4">
		<a
			href="/projects"
			class="flex items-center text-gray-600 hover:text-gray-900"
		>
			<ArrowLeft size={20} />
			<span class="ml-2">Back to Projects</span>
		</a>
	</div>

	<!-- Project Form -->
	<ProjectForm 
		on:success={handleSuccess}
		on:cancel={handleCancel}
	/>
</div>