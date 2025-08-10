<script lang="ts">
	import { onMount } from 'svelte'
	import { page } from '$app/stores'
	import { goto } from '$app/navigation'
	import { authStore } from '$lib/stores/auth.js'
	import { projectsStore } from '$lib/stores/projects.js'
	import { 
		Plus,
		Edit3,
		Trash2,
		ChevronLeft,
		BookOpen,
		Star,
		Copy,
		Download,
		Upload
	} from 'lucide-svelte'

	const projectId = $page.params.id

	$: project = $projectsStore.currentProject
	$: canEdit = project?.owner_id === $authStore.profile?.id || project?.supervisor_id === $authStore.profile?.id

	// Mock templates data
	let templates = [
		{
			id: '1',
			name: 'Setup & Planning',
			description: 'Initial site setup, equipment checks, and planning activities',
			icon: '🏗️',
			category: 'setup',
			is_system: true,
			is_favorite: true,
			usage_count: 15,
			created_by: 'System',
			created_at: '2025-01-01T00:00:00Z'
		},
		{
			id: '2',
			name: 'Daily Fieldwork',
			description: 'Standard daily field activities and measurements',
			icon: '📐',
			category: 'fieldwork',
			is_system: true,
			is_favorite: false,
			usage_count: 28,
			created_by: 'System',
			created_at: '2025-01-01T00:00:00Z'
		},
		{
			id: '3',
			name: 'Calculations & Analysis',
			description: 'Coordinate calculations, closures, and data analysis',
			icon: '🧮',
			category: 'calculations',
			is_system: true,
			is_favorite: true,
			usage_count: 12,
			created_by: 'System',
			created_at: '2025-01-01T00:00:00Z'
		},
		{
			id: '4',
			name: 'Review & QA',
			description: 'Data review, quality assurance, and final checks',
			icon: '✅',
			category: 'review',
			is_system: true,
			is_favorite: false,
			usage_count: 8,
			created_by: 'System',
			created_at: '2025-01-01T00:00:00Z'
		},
		{
			id: '5',
			name: 'Boundary Survey Template',
			description: 'Custom template for boundary surveys with cadastral references',
			icon: '🏠',
			category: 'fieldwork',
			is_system: false,
			is_favorite: true,
			usage_count: 5,
			created_by: 'John Smith',
			created_at: '2025-01-10T14:30:00Z'
		}
	]

	let selectedCategory = 'all'
	let showFavoritesOnly = false
	let searchQuery = ''

	// Filter templates
	$: filteredTemplates = templates.filter(template => {
		const matchesCategory = selectedCategory === 'all' || template.category === selectedCategory
		const matchesSearch = !searchQuery || template.name.toLowerCase().includes(searchQuery.toLowerCase()) || template.description.toLowerCase().includes(searchQuery.toLowerCase())
		const matchesFavorites = !showFavoritesOnly || template.is_favorite
		
		return matchesCategory && matchesSearch && matchesFavorites
	})

	let categories = [
		{ id: 'all', name: 'All Templates', count: templates.length },
		{ id: 'setup', name: 'Setup', count: templates.filter(t => t.category === 'setup').length },
		{ id: 'fieldwork', name: 'Fieldwork', count: templates.filter(t => t.category === 'fieldwork').length },
		{ id: 'calculations', name: 'Calculations', count: templates.filter(t => t.category === 'calculations').length },
		{ id: 'review', name: 'Review', count: templates.filter(t => t.category === 'review').length }
	]

	function goBack() {
		goto(`/projects/${projectId}/diary`)
	}

	function createNewEntry(templateId) {
		goto(`/projects/${projectId}/diary/new?template=${templateId}`)
	}

	function toggleFavorite(templateId) {
		templates = templates.map(t => 
			t.id === templateId ? { ...t, is_favorite: !t.is_favorite } : t
		)
	}

	function duplicateTemplate(templateId) {
		const template = templates.find(t => t.id === templateId)
		if (template) {
			const newTemplate = {
				...template,
				id: String(Date.now()),
				name: template.name + ' (Copy)',
				is_system: false,
				is_favorite: false,
				usage_count: 0,
				created_by: $authStore.profile?.first_name + ' ' + $authStore.profile?.last_name,
				created_at: new Date().toISOString()
			}
			templates = [...templates, newTemplate]
		}
	}

	function deleteTemplate(templateId) {
		if (confirm('Are you sure you want to delete this template?')) {
			templates = templates.filter(t => t.id !== templateId)
		}
	}

	function formatDate(dateStr) {
		return new Date(dateStr).toLocaleDateString('en-AU', {
			day: 'numeric',
			month: 'short',
			year: 'numeric'
		})
	}
</script>

<svelte:head>
	<title>Diary Templates - {project?.title || 'Project'} - TasFieldbook</title>
</svelte:head>

<div class="flex-1 flex flex-col">
	<!-- Header -->
	<div class="bg-white border-b border-gray-200 px-6 py-4">
		<div class="flex items-center justify-between">
			<div class="flex items-center space-x-4">
				<button
					on:click={goBack}
					class="inline-flex items-center text-gray-600 hover:text-gray-900"
				>
					<ChevronLeft size={20} class="mr-1" />
					Back to Diary
				</button>
				<div class="h-6 w-px bg-gray-300"></div>
				<div>
					<h1 class="text-xl font-semibold text-gray-900">Diary Templates</h1>
					<p class="text-sm text-gray-500">Manage and organize your diary entry templates</p>
				</div>
			</div>

			<div class="flex items-center space-x-2">
				<button class="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 text-sm">
					<Download size={16} class="mr-2" />
					Export
				</button>
				<button class="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 text-sm">
					<Upload size={16} class="mr-2" />
					Import
				</button>
				{#if canEdit}
					<button class="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
						<Plus size={16} class="mr-2" />
						New Template
					</button>
				{/if}
			</div>
		</div>
	</div>

	<div class="flex-1 overflow-y-auto">
		<div class="p-6 space-y-6">
			<!-- Filters -->
			<div class="bg-white rounded-lg border border-gray-200 p-4">
				<div class="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
					<!-- Search -->
					<div class="flex-1 max-w-md">
						<input
							type="text"
							placeholder="Search templates..."
							bind:value={searchQuery}
							class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
						/>
					</div>

					<!-- Category Filter -->
					<div class="flex items-center space-x-4">
						<div class="flex space-x-1">
							{#each categories as category}
								<button
									on:click={() => selectedCategory = category.id}
									class="px-3 py-2 text-sm rounded-md {selectedCategory === category.id ? 'bg-blue-100 text-blue-800 font-medium' : 'text-gray-600 hover:bg-gray-100'}"
								>
									{category.name} ({category.count})
								</button>
							{/each}
						</div>

						<div class="h-6 w-px bg-gray-300"></div>

						<label class="flex items-center text-sm">
							<input
								type="checkbox"
								bind:checked={showFavoritesOnly}
								class="mr-2"
							/>
							Favorites only
						</label>
					</div>
				</div>
			</div>

			<!-- Templates Grid -->
			<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
				{#each filteredTemplates as template}
					<div class="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
						<!-- Template Header -->
						<div class="flex items-start justify-between mb-4">
							<div class="flex items-center">
								<span class="text-2xl mr-3">{template.icon}</span>
								<div>
									<h3 class="font-semibold text-gray-900">{template.name}</h3>
									<p class="text-sm text-gray-500">
										{template.is_system ? 'System' : template.created_by}
									</p>
								</div>
							</div>
							<div class="flex items-center space-x-1">
								<button
									on:click={() => toggleFavorite(template.id)}
									class="p-1 text-gray-400 hover:text-yellow-500 {template.is_favorite ? 'text-yellow-500' : ''}"
								>
									<Star size={16} fill={template.is_favorite ? 'currentColor' : 'none'} />
								</button>
							</div>
						</div>

						<!-- Description -->
						<p class="text-gray-600 text-sm mb-4 line-clamp-2">{template.description}</p>

						<!-- Category & Stats -->
						<div class="flex items-center justify-between mb-4">
							<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 capitalize">
								{template.category}
							</span>
							<div class="text-xs text-gray-500">
								Used {template.usage_count} times
							</div>
						</div>

						<!-- Actions -->
						<div class="flex items-center justify-between">
							<button
								on:click={() => createNewEntry(template.id)}
								class="inline-flex items-center px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
							>
								<BookOpen size={14} class="mr-1" />
								Use
							</button>

							<div class="flex items-center space-x-2">
								<button
									on:click={() => duplicateTemplate(template.id)}
									class="p-2 text-gray-400 hover:text-gray-600"
									title="Duplicate"
								>
									<Copy size={16} />
								</button>
								
								{#if !template.is_system && canEdit}
									<button
										class="p-2 text-gray-400 hover:text-gray-600"
										title="Edit"
									>
										<Edit3 size={16} />
									</button>
									<button
										on:click={() => deleteTemplate(template.id)}
										class="p-2 text-gray-400 hover:text-red-600"
										title="Delete"
									>
										<Trash2 size={16} />
									</button>
								{/if}
							</div>
						</div>

						<!-- Created Date -->
						<div class="mt-3 pt-3 border-t border-gray-100">
							<p class="text-xs text-gray-500">
								Created {formatDate(template.created_at)}
							</p>
						</div>
					</div>
				{/each}
			</div>

			<!-- Empty State -->
			{#if filteredTemplates.length === 0}
				<div class="bg-white rounded-lg border border-gray-200 p-12 text-center">
					<BookOpen class="w-12 h-12 text-gray-400 mx-auto mb-4" />
					<h3 class="text-lg font-medium text-gray-900 mb-2">No templates found</h3>
					<p class="text-gray-600 mb-6">
						{searchQuery ? 'Try adjusting your search or filters.' : 'Create your first custom template to get started.'}
					</p>
					{#if canEdit && !searchQuery}
						<button class="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
							<Plus size={16} class="mr-2" />
							Create Template
						</button>
					{/if}
				</div>
			{/if}
		</div>
	</div>
</div>