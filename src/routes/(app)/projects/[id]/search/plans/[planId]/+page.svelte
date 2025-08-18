<script lang="ts">
	import { onMount } from 'svelte'
	import { page } from '$app/stores'
	import { goto } from '$app/navigation'
	import { browser } from '$app/environment'
	import { authStore } from '$lib/stores/auth.js'
	import { projectsStore } from '$lib/stores/projects.js'
	import LoadingSpinner from '$lib/components/common/LoadingSpinner.svelte'
	import ErrorMessage from '$lib/components/common/ErrorMessage.svelte'
	import { 
		ArrowLeft,
		Download,
		Edit3,
		Trash2,
		Tag,
		Share2,
		ZoomIn,
		ZoomOut,
		RotateCw,
		Move,
		Pen,
		Square,
		Circle,
		Type,
		Highlighter,
		Undo,
		Redo,
		Save,
		Settings,
		Link,
		Eye,
		EyeOff,
		Grid3x3,
		Maximize2,
		Check,
		X,
		Star,
		Calendar
	} from 'lucide-svelte'
	
	// Import services
	import { surveyPlansService } from '$lib/services/surveyPlans.service.js'
	import { planTagsService } from '$lib/services/planTags.service.js'
	import PdfAnnotationViewer from '$lib/components/pdf/PdfAnnotationViewer.svelte'
	import PlanRelationshipModal from '$lib/components/plans/PlanRelationshipModal.svelte'
	import RelationshipBreadcrumbs from '$lib/components/plans/RelationshipBreadcrumbs.svelte'
	import type { SurveyPlanWithDetails } from '$lib/types/database.js'
	import type { PdfAnnotation, AnnotationEvent } from '$lib/types/pdf-annotations.js'

	const projectId = $page.params.id
	const planId = $page.params.planId

	// Real plan data
	let plan: SurveyPlanWithDetails | null = null
	let loading = true
	let error = ''
	let pdfUrl = ''

	// PDF Annotations data
	let annotations: PdfAnnotation[] = []

	// UI State
	let showTagModal = false
	let showRelationshipModal = false
	let isFullscreen = false
	let isEditingTitle = false
	let editedTitle = ''

	// Available tags (mock data)
	let availableTags = [
		{ id: '1', name: 'boundary', color: '#3b82f6' },
		{ id: '2', name: 'residential', color: '#10b981' },
		{ id: '3', name: 'commercial', color: '#f59e0b' },
		{ id: '4', name: 'industrial', color: '#8b5cf6' },
		{ id: '5', name: 'historical', color: '#ef4444' },
		{ id: '6', name: 'easement', color: '#6b7280' }
	]

	$: project = $projectsStore.currentProject
	
	// Load plan data on mount
	onMount(async () => {
		await loadPlanData()
	})
	
	async function loadPlanData() {
		if (!planId) return
		
		loading = true
		error = ''
		
		try {
			const result = await surveyPlansService.getPlan(planId)
			
			if (result.success) {
				plan = result.data
				// console.log('Loaded plan data:', plan)
				
				// Get PDF URL for viewing
				if (plan.file_path && !plan.file_path.includes('undefined')) {
					// console.log('Loading PDF for file path:', plan.file_path)
					const urlResult = await surveyPlansService.getDownloadUrl(plan.file_path)
					// console.log('PDF URL result:', urlResult)
					if (urlResult.success && urlResult.data) {
						pdfUrl = urlResult.data
						// console.log('PDF URL set:', pdfUrl)
					} else {
						console.error('Failed to get PDF URL:', urlResult.error)
					}
				} else {
					console.warn('Plan has invalid or missing file_path:', plan.file_path)
					
					// Try to get PDF from the source document instead
					if (plan.search_document && plan.search_document.file_path && !plan.search_document.file_path.includes('undefined')) {
						// console.log('Falling back to source document PDF:', plan.search_document.file_path)
						const urlResult = await surveyPlansService.getDownloadUrl(plan.search_document.file_path)
						if (urlResult.success && urlResult.data) {
							pdfUrl = urlResult.data
							// console.log('Using source document PDF:', pdfUrl)
						}
					}
				}
			} else {
				error = result.error || 'Failed to load plan'
			}
		} catch (err) {
			error = err instanceof Error ? err.message : 'Unknown error occurred'
		} finally {
			loading = false
		}
	}
	
	async function handleDownload() {
		if (!plan?.file_path) return
		
		try {
			const result = await surveyPlansService.getDownloadUrl(plan.file_path)
			if (result.success && result.data) {
				// Create a temporary link to download the file
				const link = document.createElement('a')
				link.href = result.data
				link.download = plan.file_path.split('/').pop() || 'plan.pdf'
				document.body.appendChild(link)
				link.click()
				document.body.removeChild(link)
			} else {
				error = result.error || 'Failed to generate download link'
			}
		} catch (err) {
			error = err instanceof Error ? err.message : 'Download failed'
		}
	}
	
	async function fixFilePaths() {
		try {
			const result = await surveyPlansService.fixPlanFilePaths(projectId)
			if (result.success) {
				alert(`Fixed ${result.data} plan file paths. Please refresh the page.`)
				// Reload the plan data
				await loadPlanData()
			} else {
				alert(`Failed to fix file paths: ${result.error}`)
			}
		} catch (err) {
			alert(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`)
		}
	}

	function goBack() {
		goto(`/projects/${projectId}/search?tab=plans`)
	}

	function toggleFullscreen() {
		isFullscreen = !isFullscreen
		// In real implementation, this would use the Fullscreen API
	}

	// Annotation event handlers
	function handleAnnotationCreated(event: CustomEvent<AnnotationEvent>) {
		// console.log('Annotation created:', event.detail)
		// In real implementation, save to Supabase
	}

	function handleAnnotationUpdated(event: CustomEvent<AnnotationEvent>) {
		// console.log('Annotation updated:', event.detail)
		// In real implementation, update in Supabase
	}

	function handleAnnotationDeleted(event: CustomEvent<AnnotationEvent>) {
		// console.log('Annotation deleted:', event.detail)
		// In real implementation, delete from Supabase
	}

	function handleAnnotationsLoaded(event: CustomEvent<PdfAnnotation[]>) {
		// console.log('Annotations loaded:', event.detail)
		annotations = event.detail
	}

	function handleTagManagement() {
		showTagModal = true
	}

	function handleRelationshipManagement() {
		showRelationshipModal = true
	}

	function handleRelationshipChanged() {
		// Reload plan data to get updated relationship count
		loadPlanData()
	}

	function handleNavigateToPlan(event: CustomEvent<{ planId: string; planTitle?: string; planReferenceNumber: string }>) {
		const { planId: targetPlanId } = event.detail
		// Navigate to the target plan
		goto(`/projects/${projectId}/search/plans/${targetPlanId}`)
	}

	function handleBreadcrumbNavigate(targetPlanId: string) {
		// Navigate to the target plan
		goto(`/projects/${projectId}/search/plans/${targetPlanId}`)
	}

	function startEditingTitle() {
		editedTitle = plan?.title || plan?.reference_number || ''
		isEditingTitle = true
	}

	function cancelEditingTitle() {
		isEditingTitle = false
		editedTitle = ''
	}

	async function saveTitle() {
		if (!plan || !editedTitle.trim()) {
			cancelEditingTitle()
			return
		}

		try {
			const result = await surveyPlansService.updatePlan(planId, {
				title: editedTitle.trim()
			})

			if (result.success) {
				// Update local plan data
				plan = { ...plan, title: editedTitle.trim() }
				isEditingTitle = false
				editedTitle = ''
			} else {
				error = result.error || 'Failed to update plan title'
			}
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to update plan title'
		}
	}

	function handleTitleKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter') {
			event.preventDefault()
			saveTitle()
		} else if (event.key === 'Escape') {
			event.preventDefault()
			cancelEditingTitle()
		}
	}

	function formatDate(dateString: string) {
		return new Date(dateString).toLocaleDateString('en-AU', {
			year: 'numeric',
			month: 'short',
			day: 'numeric'
		})
	}
</script>

<svelte:head>
	<title>{plan?.title || 'Plan'} - Search Analysis - TasFieldbook</title>
</svelte:head>

{#if loading}
	<div class="h-screen flex items-center justify-center">
		<LoadingSpinner />
		<span class="ml-3 text-gray-600">Loading plan...</span>
	</div>
{:else if error}
	<div class="h-screen flex items-center justify-center">
		<ErrorMessage message={error} />
	</div>
{:else if !plan}
	<div class="h-screen flex items-center justify-center">
		<div class="text-center">
			<h2 class="text-xl font-semibold text-gray-900 mb-2">Plan not found</h2>
			<p class="text-gray-600 mb-4">The requested plan could not be found.</p>
			<button 
				onclick={goBack}
				class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
			>
				Back to Search
			</button>
		</div>
	</div>
{:else}
<div class="h-screen flex flex-col {isFullscreen ? 'fixed inset-0 z-50 bg-white' : ''}">
	<!-- Header -->
	<div class="bg-white border-b border-gray-200 px-6 py-4 flex-shrink-0">
		<div class="flex items-center justify-between">
			<div class="flex items-center space-x-4">
				<button 
					onclick={goBack}
					class="p-2 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100"
				>
					<ArrowLeft size={20} />
				</button>
				<div>
					{#if isEditingTitle}
						<div class="flex items-center space-x-2">
							<input
								type="text"
								bind:value={editedTitle}
								onkeydown={handleTitleKeydown}
								class="text-xl font-bold text-gray-900 bg-white border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
								placeholder="Enter plan title..."
								autofocus
							/>
							<button
								onclick={saveTitle}
								class="p-1 text-green-600 hover:text-green-700 rounded hover:bg-green-50"
								title="Save title"
							>
								<Check size={16} />
							</button>
							<button
								onclick={cancelEditingTitle}
								class="p-1 text-red-600 hover:text-red-700 rounded hover:bg-red-50"
								title="Cancel"
							>
								<X size={16} />
							</button>
						</div>
					{:else}
						<div class="flex items-center space-x-2 group">
							<h1 class="text-xl font-bold text-gray-900">{plan.title || plan.reference_number}</h1>
							<button
								onclick={startEditingTitle}
								class="p-1 text-gray-400 hover:text-gray-600 rounded hover:bg-gray-100 opacity-0 group-hover:opacity-100 transition-opacity"
								title="Edit title"
							>
								<Edit3 size={16} />
							</button>
						</div>
					{/if}
					<div class="flex items-center space-x-4 text-sm text-gray-500">
						<span>{plan.reference_number}</span>
						<span>•</span>
						<span>{formatDate(plan.created_at)}</span>
						{#if plan.page_numbers && plan.page_numbers.length > 0}
							<span>•</span>
							<span>{plan.page_numbers.length} pages</span>
						{/if}
						{#if plan.tags && plan.tags.length > 0}
							<span>•</span>
							<div class="flex space-x-1">
								{#each plan.tags as tag}
									<span class="inline-block text-xs px-2 py-1 rounded" style="background-color: {tag.color}20; color: {tag.color};">
										{tag.name}
									</span>
								{/each}
							</div>
						{/if}
					</div>
				</div>
			</div>
			
			<div class="flex items-center space-x-2">
				<button 
					onclick={handleTagManagement}
					class="p-2 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100"
					title="Manage tags"
				>
					<Tag size={18} />
				</button>
				<button 
					onclick={handleRelationshipManagement}
					class="p-2 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100"
					title="Manage relationships"
				>
					<Link size={18} />
				</button>
				<button 
					class="p-2 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100"
					title="Share plan"
				>
					<Share2 size={18} />
				</button>
				<button 
					onclick={handleDownload}
					class="p-2 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100"
					title="Download plan"
				>
					<Download size={18} />
				</button>
				<button 
					onclick={toggleFullscreen}
					class="p-2 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100"
					title="Fullscreen"
				>
					<Maximize2 size={18} />
				</button>
			</div>
		</div>
	</div>

	<!-- Relationship Breadcrumbs -->
	{#if plan}
		<div class="px-6 py-3 bg-white border-b border-gray-100">
			<RelationshipBreadcrumbs
				planId={plan.id}
				{projectId}
				currentPlanTitle={plan.title}
				currentPlanReferenceNumber={plan.reference_number}
				onNavigate={handleBreadcrumbNavigate}
			/>
		</div>
	{/if}

	<!-- PDF Annotation Viewer -->
	<div class="flex-1 overflow-hidden">
		{#if pdfUrl}
			<PdfAnnotationViewer
				src={pdfUrl}
				{projectId}
				{planId}
				width={isFullscreen && browser ? window.innerWidth : 1200}
				height={isFullscreen && browser ? window.innerHeight - 80 : 800}
				{annotations}
				readonly={false}
				config={{
					enableThumbnails: true,
					enableLayers: true,
					enableMeasurements: true,
					enableComments: true,
					enableExport: true,
					enableCoordinateLinking: true,
					enableMapIntegration: true,
					defaultMeasurementUnit: 'm'
				}}
				on:annotation-created={handleAnnotationCreated}
				on:annotation-updated={handleAnnotationUpdated}
				on:annotation-deleted={handleAnnotationDeleted}
				on:annotations-loaded={handleAnnotationsLoaded}
				on:viewer-ready={() => console.log('PDF viewer ready')}
				on:error={(e) => error = e.detail.message}
			/>
		{:else}
			<!-- Loading or No PDF Available -->
			<div class="flex-1 flex items-center justify-center bg-gray-100">
				<div class="bg-white shadow-lg w-[595px] h-[842px] flex items-center justify-center border border-gray-300 rounded-lg">
					{#if loading}
						<div class="text-center">
							<div class="text-gray-500 mb-2">Loading PDF...</div>
							<div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
						</div>
					{:else}
						<div class="text-center text-gray-500">
							<div class="text-lg mb-4">📄</div>
							<div class="font-medium text-gray-900 mb-2">PDF not available</div>
							<div class="text-sm mb-4">This plan's PDF file could not be loaded</div>
							{#if plan}
								<div class="space-y-2 text-left bg-gray-50 p-4 rounded-lg max-w-md">
									<div class="text-sm"><strong>Plan:</strong> {plan.reference_number}</div>
									{#if plan.title}<div class="text-sm"><strong>Title:</strong> {plan.title}</div>{/if}
									{#if plan.page_numbers && plan.page_numbers.length > 0}
										<div class="text-sm"><strong>Pages:</strong> {plan.page_numbers.join(', ')}</div>
									{/if}
									<div class="text-sm"><strong>Created:</strong> {formatDate(plan.created_at)}</div>
									{#if plan.file_path && plan.file_path.includes('undefined')}
										<button 
											onclick={fixFilePaths}
											class="mt-3 px-3 py-2 bg-yellow-600 text-white text-sm rounded-md hover:bg-yellow-700"
										>
											Fix File Paths
										</button>
									{/if}
								</div>
							{/if}
						</div>
					{/if}
				</div>
			</div>
		{/if}
	</div>

	<!-- Tag Management Modal -->
	{#if showTagModal}
		<div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
			<div class="bg-white rounded-lg p-6 max-w-md w-full mx-4">
				<h3 class="text-lg font-semibold text-gray-900 mb-4">Manage Tags</h3>
				
				<div class="space-y-4">
					<div>
						<label class="block text-sm font-medium text-gray-700 mb-2">Current Tags</label>
						<div class="flex flex-wrap gap-2">
							{#if plan.tags && plan.tags.length > 0}
								{#each plan.tags as tag}
									<span class="inline-flex items-center text-sm px-3 py-1 rounded-full" style="background-color: {tag.color}20; color: {tag.color};">
										{tag.name}
										<button class="ml-2 hover:opacity-70">×</button>
									</span>
								{/each}
							{:else}
								<p class="text-sm text-gray-500">No tags assigned</p>
							{/if}
						</div>
					</div>
					
					<div>
						<label class="block text-sm font-medium text-gray-700 mb-2">Available Tags</label>
						<div class="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
							{#each availableTags as tag}
								<label class="flex items-center space-x-2 cursor-pointer">
									<input type="checkbox" class="rounded" />
									<span class="text-sm" style="color: {tag.color}">{tag.name}</span>
								</label>
							{/each}
						</div>
					</div>
				</div>
				
				<div class="flex justify-end space-x-3 mt-6">
					<button 
						onclick={() => showTagModal = false}
						class="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
					>
						Cancel
					</button>
					<button 
						class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
					>
						Save Tags
					</button>
				</div>
			</div>
		</div>
	{/if}

	<!-- Relationship Management Modal -->
	{#if showRelationshipModal && plan}
		<PlanRelationshipModal
			planId={plan.id}
			{projectId}
			planTitle={plan.title || undefined}
			planReferenceNumber={plan.reference_number}
			on:close={() => showRelationshipModal = false}
			on:relationship-changed={handleRelationshipChanged}
			on:navigate-to-plan={handleNavigateToPlan}
		/>
	{/if}
</div>
{/if}