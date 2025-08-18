<script lang="ts">
	import { onMount } from 'svelte'
	import { page } from '$app/stores'
	import { goto } from '$app/navigation'
	import { authStore } from '$lib/stores/auth.js'
	import { projectsStore } from '$lib/stores/projects.js'
	import LoadingSpinner from '$lib/components/common/LoadingSpinner.svelte'
	import ErrorMessage from '$lib/components/common/ErrorMessage.svelte'
	import DocumentUpload from '$lib/components/search/DocumentUpload.svelte'
	import PlansHierarchyView from '$lib/components/plans/PlansHierarchyView.svelte'
	import { 
		Upload, 
		FileText, 
		Grid3x3, 
		List, 
		Search,
		Filter,
		MoreVertical,
		Download,
		Trash2,
		Eye,
		CheckCircle,
		Clock,
		AlertCircle,
		Plus,
		RefreshCw,
		Link,
		GitBranch,
		Star,
		Calendar
	} from 'lucide-svelte'
	
	// Import services
	import { searchDocumentsService } from '$lib/services/searchDocuments.service.js'
	import { surveyPlansService } from '$lib/services/surveyPlans.service.js'
	import { planTagsService } from '$lib/services/planTags.service.js'
	
	import type { SearchDocument, SurveyPlanWithDetails, PlanTag, PlanFilters } from '$lib/types/database.js'

	const projectId = $page.params.id

	// Real data from services
	let searchDocuments: SearchDocument[] = []
	let surveyPlans: SurveyPlanWithDetails[] = []
	let availableTags: PlanTag[] = []
	let loading = true
	let error = ''

	// Set initial view based on URL parameter
	let currentView = $page.url.searchParams.get('tab') === 'plans' ? 'plans' : 'documents' // 'documents' | 'plans'
	let viewMode = 'grid' // 'grid' | 'list' | 'hierarchy'
	let searchQuery = ''
	let selectedTags: string[] = []
	let showUploadModal = false

	$: project = $projectsStore.currentProject
	
	// Reactive filtering for plans
	$: planFilters = {
		search: searchQuery || undefined,
		tags: selectedTags.length > 0 ? selectedTags : undefined,
		sort_by: 'created_at' as const,
		sort_order: 'desc' as const
	} satisfies PlanFilters
	
	$: filteredPlans = surveyPlans.filter(plan => {
		const matchesSearch = !searchQuery || 
			plan.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
			plan.reference_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
			plan.description?.toLowerCase().includes(searchQuery.toLowerCase())
		
		const matchesTags = selectedTags.length === 0 || 
			(plan.tags && selectedTags.some(tagId => 
				plan.tags!.some(tag => tag.id === tagId)
			))
		
		return matchesSearch && matchesTags
	})
	
	// Load data on mount
	onMount(async () => {
		await loadData()
	})
	
	async function loadData() {
		if (!projectId) return
		
		loading = true
		error = ''
		
		try {
			// Load documents and plans in parallel
			const [documentsResult, plansResult, tagsResult] = await Promise.all([
				searchDocumentsService.listDocuments(projectId),
				surveyPlansService.listPlans(projectId, planFilters),
				planTagsService.getProjectTags(projectId)
			])
			
			if (documentsResult.success) {
				searchDocuments = documentsResult.data || []
			} else {
				console.error('Failed to load documents:', documentsResult.error)
			}
			
			if (plansResult.success) {
				surveyPlans = plansResult.data || []
			} else {
				console.error('Failed to load plans:', plansResult.error)
			}
			
			if (tagsResult.success) {
				availableTags = tagsResult.data || []
			} else {
				console.error('Failed to load tags:', tagsResult.error)
			}
			
		} catch (err) {
			error = err instanceof Error ? err.message : 'Unknown error occurred'
		} finally {
			loading = false
		}
	}
	
	// Reload plans when filters change
	$: if (projectId && !loading) {
		loadPlans()
	}
	
	async function loadPlans() {
		const result = await surveyPlansService.listPlans(projectId, planFilters)
		if (result.success) {
			surveyPlans = result.data || []
		}
	}

	function formatFileSize(bytes) {
		if (bytes === 0) return '0 Bytes'
		const k = 1024
		const sizes = ['Bytes', 'KB', 'MB', 'GB']
		const i = Math.floor(Math.log(bytes) / Math.log(k))
		return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
	}

	function formatDate(dateString) {
		return new Date(dateString).toLocaleDateString('en-AU', {
			year: 'numeric',
			month: 'short',
			day: 'numeric'
		})
	}

	function getStatusColor(status) {
		switch (status) {
			case 'pending': return 'bg-yellow-100 text-yellow-800'
			case 'approved': return 'bg-green-100 text-green-800'
			case 'rejected': return 'bg-red-100 text-red-800'
			default: return 'bg-gray-100 text-gray-800'
		}
	}

	function getStatusIcon(status) {
		switch (status) {
			case 'pending': return Clock
			case 'approved': return CheckCircle
			case 'rejected': return AlertCircle
			default: return Clock
		}
	}

	function handleUpload() {
		showUploadModal = true
	}
	
	function handleUploadComplete() {
		showUploadModal = false
		// Reload documents to show the new upload
		loadData()
	}

	async function handleDocumentProcess(documentId: string) {
		try {
			const result = await searchDocumentsService.processDocument(documentId)
			if (result.success) {
				// Reload data to see processed plans
				await loadData()
			} else {
				error = result.error || 'Failed to process document'
			}
		} catch (err) {
			error = err instanceof Error ? err.message : 'Unknown error occurred'
		}
	}
	
	async function handleDocumentDelete(documentId: string) {
		if (!confirm('Are you sure you want to delete this document? This cannot be undone.')) {
			return
		}
		
		try {
			const result = await searchDocumentsService.deleteDocument(documentId)
			if (result.success) {
				// Remove from local state
				searchDocuments = searchDocuments.filter(doc => doc.id !== documentId)
				// Also reload plans as they may have been affected
				await loadPlans()
			} else {
				error = result.error || 'Failed to delete document'
			}
		} catch (err) {
			error = err instanceof Error ? err.message : 'Unknown error occurred'
		}
	}
	
	async function handleDocumentDownload(filePath: string) {
		try {
			const result = await searchDocumentsService.getDownloadUrl(filePath)
			if (result.success && result.data) {
				// Create a temporary link to download the file
				const link = document.createElement('a')
				link.href = result.data
				link.download = filePath.split('/').pop() || 'document.pdf'
				document.body.appendChild(link)
				link.click()
				document.body.removeChild(link)
			} else {
				error = result.error || 'Failed to generate download link'
			}
		} catch (err) {
			error = err instanceof Error ? err.message : 'Unknown error occurred'
		}
	}

	function handlePlanView(planId: string) {
		goto(`/projects/${projectId}/search/plans/${planId}`)
	}
	
	function toggleTagFilter(tagId: string) {
		if (selectedTags.includes(tagId)) {
			selectedTags = selectedTags.filter(id => id !== tagId)
		} else {
			selectedTags = [...selectedTags, tagId]
		}
	}
	
	function clearTagFilters() {
		selectedTags = []
	}
	
	async function refreshData() {
		await loadData()
	}

	async function toggleStar(plan: SurveyPlanWithDetails, event: Event) {
		event.stopPropagation() // Prevent plan navigation
		
		try {
			const result = await surveyPlansService.toggleStarPlan(plan.id)
			if (result.success) {
				// Update local state
				const updatedPlans = surveyPlans.map(p => 
					p.id === plan.id ? { ...p, is_starred: !p.is_starred } : p
				)
				surveyPlans = updatedPlans
			} else {
				error = result.error || 'Failed to update star status'
			}
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to update star status'
		}
	}

	async function updatePlanYear(plan: SurveyPlanWithDetails, year: number | null, event: Event) {
		event.stopPropagation() // Prevent plan navigation
		
		try {
			const result = await surveyPlansService.updatePlanYear(plan.id, year)
			if (result.success) {
				// Update local state
				const updatedPlans = surveyPlans.map(p => 
					p.id === plan.id ? { ...p, plan_year: year } : p
				)
				surveyPlans = updatedPlans
			} else {
				error = result.error || 'Failed to update plan year'
			}
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to update plan year'
		}
	}
</script>

<svelte:head>
	<title>Search Analysis - {project?.title || 'Project'} - TasFieldbook</title>
</svelte:head>

{#if loading}
	<div class="flex items-center justify-center py-12">
		<LoadingSpinner />
		<span class="ml-3 text-gray-600">Loading search documents...</span>
	</div>
{:else}
	<div class="space-y-6">
		<!-- Error Message -->
		{#if error}
			<ErrorMessage message={error} />
		{/if}

		<!-- Header -->
		<div class="bg-white rounded-lg shadow">
			<div class="px-6 py-4 border-b border-gray-200">
				<div class="flex items-center justify-between">
					<div>
						<h1 class="text-2xl font-bold text-gray-900">Search Analysis</h1>
						<p class="text-gray-600 mt-1">Upload and manage survey search documents</p>
					</div>
					<div class="flex items-center space-x-2">
						<button 
							on:click={refreshData}
							class="inline-flex items-center px-3 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
							title="Refresh data"
						>
							<RefreshCw size={16} />
						</button>
						<button 
							on:click={handleUpload}
							class="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
						>
							<Upload size={16} class="mr-2" />
							Upload Document
						</button>
					</div>
				</div>
			</div>

		<!-- View Toggle -->
		<div class="px-6 py-4">
			<div class="flex items-center justify-between">
				<div class="flex items-center space-x-4">
					<div class="flex bg-gray-100 rounded-lg p-1">
						<button 
							on:click={() => { 
								currentView = 'documents'
								goto(`/projects/${projectId}/search?tab=documents`, { replaceState: true })
							}}
							class="px-4 py-2 rounded-md text-sm font-medium transition-colors {currentView === 'documents' ? 'bg-white text-gray-900 shadow' : 'text-gray-600 hover:text-gray-900'}"
						>
							<FileText size={16} class="mr-2 inline" />
							Documents ({searchDocuments.length})
						</button>
						<button 
							on:click={() => { 
								currentView = 'plans'
								goto(`/projects/${projectId}/search?tab=plans`, { replaceState: true })
							}}
							class="px-4 py-2 rounded-md text-sm font-medium transition-colors {currentView === 'plans' ? 'bg-white text-gray-900 shadow' : 'text-gray-600 hover:text-gray-900'}"
						>
							<Grid3x3 size={16} class="mr-2 inline" />
							Plans ({surveyPlans.length})
						</button>
					</div>
				</div>

				{#if currentView === 'plans'}
					<div class="flex items-center space-x-2">
						<!-- Search -->
						<div class="relative">
							<Search size={16} class="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
							<input 
								type="text" 
								placeholder="Search plans..."
								bind:value={searchQuery}
								class="pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
							/>
						</div>

						<!-- View Mode Toggle -->
						<div class="flex bg-gray-100 rounded-lg p-1">
							<button 
								on:click={() => viewMode = 'grid'}
								class="p-2 rounded-md {viewMode === 'grid' ? 'bg-white shadow' : 'hover:bg-gray-200'}"
								title="Grid view"
							>
								<Grid3x3 size={16} class="text-gray-600" />
							</button>
							<button 
								on:click={() => viewMode = 'list'}
								class="p-2 rounded-md {viewMode === 'list' ? 'bg-white shadow' : 'hover:bg-gray-200'}"
								title="List view"
							>
								<List size={16} class="text-gray-600" />
							</button>
							<button 
								on:click={() => viewMode = 'hierarchy'}
								class="p-2 rounded-md {viewMode === 'hierarchy' ? 'bg-white shadow' : 'hover:bg-gray-200'}"
								title="Hierarchy view"
							>
								<GitBranch size={16} class="text-gray-600" />
							</button>
						</div>

						<button class="p-2 border border-gray-300 rounded-md hover:bg-gray-50" title="Filters">
							<Filter size={16} class="text-gray-600" />
						</button>
					</div>
				{/if}
			</div>
		</div>
	</div>

	<!-- Documents View -->
	{#if currentView === 'documents'}
		<div class="bg-white rounded-lg shadow">
			<div class="px-6 py-4 border-b border-gray-200">
				<h2 class="text-lg font-semibold text-gray-900">Uploaded Documents</h2>
			</div>
			<div class="divide-y divide-gray-200">
				{#each searchDocuments as document}
					<div class="px-6 py-4 hover:bg-gray-50">
						<div class="flex items-center justify-between">
							<div class="flex items-center space-x-4">
								<div class="flex-shrink-0">
									<FileText size={24} class="text-red-500" />
								</div>
								<div class="flex-1 min-w-0">
									<h3 class="text-sm font-medium text-gray-900 truncate">{document.title}</h3>
									<div class="flex items-center space-x-4 mt-1 text-sm text-gray-500">
										{#if document.file_size}
											<span>{formatFileSize(document.file_size)}</span>
											<span>•</span>
										{/if}
										<span>Uploaded {formatDate(document.created_at)}</span>
										{#if surveyPlans.filter(plan => plan.search_document_id === document.id).length > 0}
											<span>•</span>
											<span class="text-blue-600">
												{surveyPlans.filter(plan => plan.search_document_id === document.id).length} plans extracted
											</span>
										{/if}
									</div>
								</div>
							</div>
							<div class="flex items-center space-x-4">
								<span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium {getStatusColor(document.status)}">
									<svelte:component this={getStatusIcon(document.status)} class="w-3 h-3 mr-1" />
									{document.status}
								</span>
								<div class="flex items-center space-x-2">
									<button class="p-2 text-gray-400 hover:text-gray-600" title="View document">
										<Eye size={16} />
									</button>
									<button 
										on:click={() => handleDocumentDownload(document.file_path)}
										class="p-2 text-gray-400 hover:text-gray-600" 
										title="Download"
									>
										<Download size={16} />
									</button>
									{#if document.status === 'approved' && surveyPlans.filter(plan => plan.search_document_id === document.id).length === 0}
										<button 
											on:click={() => handleDocumentProcess(document.id)}
											class="px-3 py-1 bg-blue-600 text-white text-xs rounded-md hover:bg-blue-700"
										>
											Process
										</button>
									{/if}
									<button 
										on:click={() => handleDocumentDelete(document.id)}
										class="p-2 text-gray-400 hover:text-red-600" 
										title="Delete"
									>
										<Trash2 size={16} />
									</button>
								</div>
							</div>
						</div>
					</div>
				{:else}
					<div class="px-6 py-12 text-center">
						<FileText size={48} class="mx-auto text-gray-300 mb-4" />
						<h3 class="text-lg font-medium text-gray-900 mb-2">No documents uploaded</h3>
						<p class="text-gray-600 mb-4">Upload your first survey search document to get started</p>
						<button 
							on:click={handleUpload}
							class="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
						>
							<Upload size={16} class="mr-2" />
							Upload Document
						</button>
					</div>
				{/each}
			</div>
		</div>
	{/if}

	<!-- Plans View -->
	{#if currentView === 'plans'}
		<div class="bg-white rounded-lg shadow">
			<div class="px-6 py-4 border-b border-gray-200">
				<div class="flex items-center justify-between">
					<h2 class="text-lg font-semibold text-gray-900">Survey Plans</h2>
					<div class="text-sm text-gray-500">
						{filteredPlans.length} of {surveyPlans.length} plans
					</div>
				</div>
			</div>
			
			{#if viewMode === 'grid'}
				<div class="p-6">
					<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
						{#each filteredPlans as plan}
							<div class="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
								 on:click={() => handlePlanView(plan.id)}
								 role="button"
								 tabindex="0"
								 on:keydown={(e) => e.key === 'Enter' && handlePlanView(plan.id)}>
								<div class="flex items-start justify-between mb-3">
									<div class="flex-1">
										<div class="flex items-center space-x-2 mb-1">
											<h3 class="font-medium text-gray-900 text-sm">{plan.title || 'Untitled Plan'}</h3>
											{#if plan.is_starred}
												<Star size={14} class="text-yellow-500 fill-current" />
											{/if}
										</div>
										<p class="text-xs text-gray-500 mb-2">{plan.reference_number}</p>
										<div class="flex items-center space-x-2 text-xs">
											<Calendar size={12} class="text-gray-400" />
											<input
												type="number"
												placeholder="Year"
												value={plan.plan_year || ''}
												on:input={(e) => {
													const year = e.target.value ? parseInt(e.target.value) : null
													updatePlanYear(plan, year, e)
												}}
												on:click={(e) => e.stopPropagation()}
												class="w-16 px-1 py-0.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent"
											/>
										</div>
									</div>
									<div class="flex items-center space-x-1">
										<button 
											on:click={(e) => toggleStar(plan, e)}
											class="p-1 rounded hover:bg-gray-100 {plan.is_starred ? 'text-yellow-500' : 'text-gray-400 hover:text-yellow-500'}"
											title={plan.is_starred ? 'Unstar plan' : 'Star plan'}
										>
											<Star size={16} class={plan.is_starred ? 'fill-current' : ''} />
										</button>
										<button class="p-1 text-gray-400 hover:text-gray-600 rounded hover:bg-gray-100">
											<MoreVertical size={16} />
										</button>
									</div>
								</div>
								
								<!-- Plan Preview Placeholder -->
								<div class="bg-gray-100 rounded-md h-32 mb-3 flex items-center justify-center">
									<FileText size={24} class="text-gray-400" />
									{#if plan.annotations_count && plan.annotations_count > 0}
										<span class="absolute -mt-8 -mr-8 bg-blue-600 text-white text-xs px-2 py-1 rounded-full">
											{plan.annotations_count}
										</span>
									{/if}
								</div>
								
								{#if plan.description}
									<p class="text-xs text-gray-600 mb-3 line-clamp-2">{plan.description}</p>
								{/if}
								
								<div class="flex flex-wrap gap-1 mb-3">
									{#if plan.tags && plan.tags.length > 0}
										{#each plan.tags as tag}
											<span 
												class="inline-block text-xs px-2 py-1 rounded" 
												style="background-color: {tag.color}20; color: {tag.color};"
											>
												{tag.name}
											</span>
										{/each}
									{:else}
										<span class="text-xs text-gray-400">No tags</span>
									{/if}
								</div>
								
								<div class="flex items-center justify-between text-xs text-gray-500">
									<span>{formatDate(plan.created_at)}</span>
									{#if plan.relationships_count && plan.relationships_count > 0}
										<span class="flex items-center text-blue-600">
											<Link size={12} class="mr-1" />
											{plan.relationships_count}
										</span>
									{/if}
								</div>
							</div>
						{/each}
					</div>
				</div>
			{:else if viewMode === 'hierarchy'}
				<div class="p-6">
					<PlansHierarchyView 
						plans={filteredPlans}
						{projectId}
						onPlanView={handlePlanView}
					/>
				</div>
			{:else}
				<div class="divide-y divide-gray-200">
					{#each filteredPlans as plan}
						<div class="px-6 py-4 hover:bg-gray-50 cursor-pointer"
							 on:click={() => handlePlanView(plan.id)}
							 role="button"
							 tabindex="0"
							 on:keydown={(e) => e.key === 'Enter' && handlePlanView(plan.id)}>
							<div class="flex items-center justify-between">
								<div class="flex items-center space-x-4">
									<div class="flex-shrink-0 relative">
										<FileText size={20} class="text-blue-500" />
										{#if plan.annotations_count && plan.annotations_count > 0}
											<span class="absolute -top-2 -right-2 bg-blue-600 text-white text-xs px-1.5 py-0.5 rounded-full">
												{plan.annotations_count}
											</span>
										{/if}
									</div>
									<div class="flex-1 min-w-0">
										<div class="flex items-center space-x-2">
											<h3 class="text-sm font-medium text-gray-900">{plan.title || 'Untitled Plan'}</h3>
											{#if plan.is_starred}
												<Star size={14} class="text-yellow-500 fill-current" />
											{/if}
										</div>
										<div class="flex items-center space-x-4 mt-1 text-sm text-gray-500">
											<span>{plan.reference_number}</span>
											<span>•</span>
											<span>{formatDate(plan.created_at)}</span>
											{#if plan.plan_year}
												<span>•</span>
												<span class="flex items-center">
													<Calendar size={12} class="mr-1" />
													{plan.plan_year}
												</span>
											{/if}
											{#if plan.relationships_count && plan.relationships_count > 0}
												<span>•</span>
												<span class="flex items-center text-blue-600">
													<Link size={12} class="mr-1" />
													{plan.relationships_count} linked
												</span>
											{/if}
										</div>
									</div>
								</div>
								<div class="flex items-center space-x-4">
									<div class="flex items-center space-x-3">
										<div class="flex flex-wrap gap-1">
											{#if plan.tags && plan.tags.length > 0}
												{#each plan.tags.slice(0, 2) as tag}
													<span 
														class="inline-block text-xs px-2 py-1 rounded"
														style="background-color: {tag.color}20; color: {tag.color};"
													>
														{tag.name}
													</span>
												{/each}
												{#if plan.tags.length > 2}
													<span class="text-xs text-gray-500">+{plan.tags.length - 2}</span>
												{/if}
											{:else}
												<span class="text-xs text-gray-400">No tags</span>
											{/if}
										</div>
										
										<!-- Year input -->
										<div class="flex items-center space-x-1" on:click={(e) => e.stopPropagation()}>
											<Calendar size={14} class="text-gray-400" />
											<input
												type="number"
												placeholder="Year"
												value={plan.plan_year || ''}
												on:input={(e) => {
													const year = e.target.value ? parseInt(e.target.value) : null
													updatePlanYear(plan, year, e)
												}}
												class="w-20 px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent"
											/>
										</div>
										
										<!-- Actions -->
										<div class="flex items-center space-x-1">
											<button 
												on:click={(e) => toggleStar(plan, e)}
												class="p-1 rounded hover:bg-gray-100 {plan.is_starred ? 'text-yellow-500' : 'text-gray-400 hover:text-yellow-500'}"
												title={plan.is_starred ? 'Unstar plan' : 'Star plan'}
											>
												<Star size={16} class={plan.is_starred ? 'fill-current' : ''} />
											</button>
											<button class="p-1 text-gray-400 hover:text-gray-600 rounded hover:bg-gray-100">
												<MoreVertical size={16} />
											</button>
										</div>
									</div>
								</div>
							</div>
						</div>
					{:else}
						<div class="px-6 py-12 text-center">
							<Grid3x3 size={48} class="mx-auto text-gray-300 mb-4" />
							<h3 class="text-lg font-medium text-gray-900 mb-2">No plans found</h3>
							<p class="text-gray-600">Upload and process documents to extract survey plans</p>
						</div>
					{/each}
				</div>
			{/if}
		</div>
	{/if}

	<!-- Upload Modal -->
	{#if showUploadModal}
		<div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
			<div class="bg-white rounded-lg max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
				<DocumentUpload 
					{projectId}
					on:upload-complete={handleUploadComplete}
					on:cancel={() => showUploadModal = false}
				/>
			</div>
		</div>
	{/if}
</div>
{/if}