<script lang="ts">
	import { onMount } from 'svelte'
	import { page } from '$app/stores'
	import { goto } from '$app/navigation'
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
		Maximize2
	} from 'lucide-svelte'

	const projectId = $page.params.id
	const planId = $page.params.planId

	// Mock plan data
	let plan = {
		id: planId,
		reference_number: '432367-1',
		title: 'Plan of Survey - Lot 1',
		description: 'Boundary survey for residential subdivision',
		file_path: '/storage/plans/432367-1.pdf',
		status: 'active',
		tags: ['boundary', 'residential'],
		created_at: '2024-01-15T11:00:00Z',
		search_document_id: '1'
	}

	// Mock annotations
	let annotations = [
		{
			id: '1',
			type: 'text',
			page_number: 1,
			x: 100,
			y: 150,
			content: 'Check boundary monument',
			style: { color: '#ef4444', fontSize: 14 }
		},
		{
			id: '2',
			type: 'rectangle',
			page_number: 1,
			x: 200,
			y: 300,
			width: 150,
			height: 100,
			style: { color: '#3b82f6', strokeWidth: 2, fill: 'rgba(59, 130, 246, 0.1)' }
		}
	]

	// UI State
	let currentTool = 'move' // 'move' | 'pen' | 'rectangle' | 'circle' | 'text' | 'highlighter'
	let zoom = 100
	let rotation = 0
	let showAnnotations = true
	let showGrid = false
	let isFullscreen = false
	let selectedAnnotation = null
	let showTagModal = false
	let showRelationshipModal = false

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
	$: selectedAnnotationData = selectedAnnotation ? annotations.find(a => a.id === selectedAnnotation) : null

	function goBack() {
		goto(`/projects/${projectId}/search`)
	}

	function handleZoomIn() {
		zoom = Math.min(zoom + 25, 400)
	}

	function handleZoomOut() {
		zoom = Math.max(zoom - 25, 25)
	}

	function handleRotate() {
		rotation = (rotation + 90) % 360
	}

	function handleToolSelect(tool) {
		currentTool = tool
		selectedAnnotation = null
	}

	function handleSaveAnnotations() {
		// In real implementation, this would save to the database
	}

	function toggleFullscreen() {
		isFullscreen = !isFullscreen
		// In real implementation, this would use the Fullscreen API
	}

	function handleTagManagement() {
		showTagModal = true
	}

	function handleRelationshipManagement() {
		showRelationshipModal = true
	}

	function formatDate(dateString) {
		return new Date(dateString).toLocaleDateString('en-AU', {
			year: 'numeric',
			month: 'short',
			day: 'numeric'
		})
	}
</script>

<svelte:head>
	<title>{plan.title} - Search Analysis - TasFieldbook</title>
</svelte:head>

<div class="h-screen flex flex-col {isFullscreen ? 'fixed inset-0 z-50 bg-white' : ''}">
	<!-- Header -->
	<div class="bg-white border-b border-gray-200 px-6 py-4 flex-shrink-0">
		<div class="flex items-center justify-between">
			<div class="flex items-center space-x-4">
				<button 
					on:click={goBack}
					class="p-2 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100"
				>
					<ArrowLeft size={20} />
				</button>
				<div>
					<h1 class="text-xl font-bold text-gray-900">{plan.title}</h1>
					<div class="flex items-center space-x-4 text-sm text-gray-500">
						<span>{plan.reference_number}</span>
						<span>•</span>
						<span>{formatDate(plan.created_at)}</span>
						<span>•</span>
						<div class="flex space-x-1">
							{#each plan.tags as tag}
								<span class="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
									{tag}
								</span>
							{/each}
						</div>
					</div>
				</div>
			</div>
			
			<div class="flex items-center space-x-2">
				<button 
					on:click={handleTagManagement}
					class="p-2 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100"
					title="Manage tags"
				>
					<Tag size={18} />
				</button>
				<button 
					on:click={handleRelationshipManagement}
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
					class="p-2 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100"
					title="Download plan"
				>
					<Download size={18} />
				</button>
				<button 
					on:click={toggleFullscreen}
					class="p-2 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100"
					title="Fullscreen"
				>
					<Maximize2 size={18} />
				</button>
			</div>
		</div>
	</div>

	<div class="flex flex-1 overflow-hidden">
		<!-- Toolbar -->
		<div class="bg-white border-r border-gray-200 w-16 flex flex-col items-center py-4 space-y-2 flex-shrink-0">
			<!-- Navigation Tools -->
			<button 
				on:click={() => handleToolSelect('move')}
				class="p-3 rounded-lg {currentTool === 'move' ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}"
				title="Move/Pan"
			>
				<Move size={20} />
			</button>

			<div class="w-8 h-px bg-gray-200 my-2"></div>

			<!-- Annotation Tools -->
			<button 
				on:click={() => handleToolSelect('pen')}
				class="p-3 rounded-lg {currentTool === 'pen' ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}"
				title="Freehand drawing"
			>
				<Pen size={20} />
			</button>
			
			<button 
				on:click={() => handleToolSelect('rectangle')}
				class="p-3 rounded-lg {currentTool === 'rectangle' ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}"
				title="Rectangle"
			>
				<Square size={20} />
			</button>
			
			<button 
				on:click={() => handleToolSelect('circle')}
				class="p-3 rounded-lg {currentTool === 'circle' ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}"
				title="Circle"
			>
				<Circle size={20} />
			</button>
			
			<button 
				on:click={() => handleToolSelect('text')}
				class="p-3 rounded-lg {currentTool === 'text' ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}"
				title="Text annotation"
			>
				<Type size={20} />
			</button>
			
			<button 
				on:click={() => handleToolSelect('highlighter')}
				class="p-3 rounded-lg {currentTool === 'highlighter' ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}"
				title="Highlighter"
			>
				<Highlighter size={20} />
			</button>

			<div class="w-8 h-px bg-gray-200 my-2"></div>

			<!-- Action Tools -->
			<button 
				class="p-3 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
				title="Undo"
			>
				<Undo size={20} />
			</button>
			
			<button 
				class="p-3 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
				title="Redo"
			>
				<Redo size={20} />
			</button>
			
			<button 
				on:click={handleSaveAnnotations}
				class="p-3 rounded-lg text-blue-600 hover:text-blue-700 hover:bg-blue-50"
				title="Save annotations"
			>
				<Save size={20} />
			</button>
		</div>

		<!-- Main Content Area -->
		<div class="flex-1 flex flex-col overflow-hidden">
			<!-- Viewer Controls -->
			<div class="bg-gray-50 border-b border-gray-200 px-4 py-2 flex items-center justify-between flex-shrink-0">
				<div class="flex items-center space-x-4">
					<div class="flex items-center space-x-2">
						<button 
							on:click={handleZoomOut}
							class="p-1 text-gray-400 hover:text-gray-600"
						>
							<ZoomOut size={16} />
						</button>
						<span class="text-sm text-gray-600 min-w-[60px] text-center">{zoom}%</span>
						<button 
							on:click={handleZoomIn}
							class="p-1 text-gray-400 hover:text-gray-600"
						>
							<ZoomIn size={16} />
						</button>
					</div>
					
					<button 
						on:click={handleRotate}
						class="p-1 text-gray-400 hover:text-gray-600"
						title="Rotate"
					>
						<RotateCw size={16} />
					</button>
					
					<button 
						on:click={() => showAnnotations = !showAnnotations}
						class="flex items-center space-x-1 px-2 py-1 text-sm {showAnnotations ? 'text-blue-600' : 'text-gray-600'}"
						title="Toggle annotations"
					>
						<svelte:component this={showAnnotations ? Eye : EyeOff} size={16} />
						<span>Annotations</span>
					</button>
					
					<button 
						on:click={() => showGrid = !showGrid}
						class="flex items-center space-x-1 px-2 py-1 text-sm {showGrid ? 'text-blue-600' : 'text-gray-600'}"
						title="Toggle grid"
					>
						<Grid3x3 size={16} />
						<span>Grid</span>
					</button>
				</div>
				
				<div class="text-sm text-gray-500">
					Page 1 of 1
				</div>
			</div>

			<!-- PDF Viewer Area -->
			<div class="flex-1 bg-gray-100 relative overflow-hidden">
				<div class="absolute inset-0 flex items-center justify-center">
					<!-- PDF Viewer Container -->
					<div 
						class="bg-white shadow-lg relative"
						style="transform: scale({zoom/100}) rotate({rotation}deg); transform-origin: center center;"
					>
						<!-- Mock PDF Page -->
						<div class="w-[595px] h-[842px] bg-white border border-gray-300 relative">
							<!-- Mock PDF Content -->
							<div class="p-8">
								<h2 class="text-lg font-bold mb-4">PLAN OF SURVEY</h2>
								<div class="text-sm space-y-2">
									<p><strong>Lot:</strong> 1</p>
									<p><strong>Parish:</strong> Hobart</p>
									<p><strong>Reference:</strong> {plan.reference_number}</p>
									<p><strong>Scale:</strong> 1:500</p>
								</div>
								
								<!-- Mock plan drawing area -->
								<div class="mt-8 border border-gray-400" style="width: 400px; height: 300px;">
									<svg width="400" height="300" class="border">
										<!-- Mock boundary lines -->
										<rect x="50" y="50" width="300" height="200" fill="none" stroke="#000" stroke-width="2"/>
										<rect x="100" y="100" width="200" height="100" fill="none" stroke="#666" stroke-width="1"/>
										
										<!-- Mock measurements -->
										<text x="200" y="40" text-anchor="middle" font-size="10">50.00m</text>
										<text x="30" y="150" text-anchor="middle" font-size="10" transform="rotate(-90, 30, 150)">30.00m</text>
									</svg>
								</div>
							</div>
							
							<!-- Annotations Overlay -->
							{#if showAnnotations}
								<div class="absolute inset-0 pointer-events-none">
									{#each annotations as annotation}
										{#if annotation.type === 'text'}
											<div 
												class="absolute pointer-events-auto cursor-pointer"
												style="left: {annotation.x}px; top: {annotation.y}px; color: {annotation.style.color}; font-size: {annotation.style.fontSize}px;"
												on:click={() => selectedAnnotation = annotation.id}
											>
												{annotation.content}
											</div>
										{:else if annotation.type === 'rectangle'}
											<div 
												class="absolute border-2 pointer-events-auto cursor-pointer"
												style="left: {annotation.x}px; top: {annotation.y}px; width: {annotation.width}px; height: {annotation.height}px; border-color: {annotation.style.color}; background-color: {annotation.style.fill};"
												on:click={() => selectedAnnotation = annotation.id}
											></div>
										{/if}
									{/each}
								</div>
							{/if}
							
							<!-- Grid Overlay -->
							{#if showGrid}
								<div class="absolute inset-0 pointer-events-none">
									<svg width="100%" height="100%" class="opacity-20">
										{#each Array(20) as _, i}
											<line x1="{i * 30}" y1="0" x2="{i * 30}" y2="100%" stroke="#666" stroke-width="0.5"/>
											<line x1="0" y1="{i * 40}" x2="100%" y2="{i * 40}" stroke="#666" stroke-width="0.5"/>
										{/each}
									</svg>
								</div>
							{/if}
						</div>
					</div>
				</div>
			</div>
		</div>

		<!-- Properties Panel -->
		{#if selectedAnnotation}
			<div class="bg-white border-l border-gray-200 w-80 flex-shrink-0 p-4">
				<h3 class="text-lg font-semibold text-gray-900 mb-4">Annotation Properties</h3>
				
				<div class="space-y-4">
					<div>
						<label class="block text-sm font-medium text-gray-700 mb-2">Type</label>
						<input type="text" value={selectedAnnotationData?.type || ''} readonly 
							   class="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50" />
					</div>
					
					{#if selectedAnnotationData?.type === 'text'}
						<div>
							<label class="block text-sm font-medium text-gray-700 mb-2">Content</label>
							<textarea 
								class="w-full px-3 py-2 border border-gray-300 rounded-md"
								rows="3"
								bind:value={selectedAnnotationData.content}
							></textarea>
						</div>
					{/if}
					
					<div>
						<label class="block text-sm font-medium text-gray-700 mb-2">Color</label>
						<input 
							type="color" 
							class="w-full h-10 border border-gray-300 rounded-md"
							bind:value={selectedAnnotationData.style.color}
						/>
					</div>
					
					<div class="flex space-x-2">
						<button 
							on:click={handleSaveAnnotations}
							class="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
						>
							Save
						</button>
						<button 
							class="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
						>
							Delete
						</button>
					</div>
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
							{#each plan.tags as tag}
								<span class="inline-flex items-center bg-blue-100 text-blue-800 text-sm px-3 py-1 rounded-full">
									{tag}
									<button class="ml-2 text-blue-600 hover:text-blue-800">×</button>
								</span>
							{/each}
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
						on:click={() => showTagModal = false}
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
	{#if showRelationshipModal}
		<div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
			<div class="bg-white rounded-lg p-6 max-w-2xl w-full mx-4">
				<h3 class="text-lg font-semibold text-gray-900 mb-4">Plan Relationships</h3>
				
				<div class="space-y-4">
					<div>
						<h4 class="font-medium text-gray-900 mb-2">Related Plans</h4>
						<div class="border border-gray-200 rounded-lg p-4 bg-gray-50">
							<p class="text-sm text-gray-600">No relationships defined yet.</p>
						</div>
					</div>
					
					<div>
						<h4 class="font-medium text-gray-900 mb-2">Add Relationship</h4>
						<div class="grid grid-cols-2 gap-4">
							<div>
								<label class="block text-sm font-medium text-gray-700 mb-1">Relationship Type</label>
								<select class="w-full px-3 py-2 border border-gray-300 rounded-md">
									<option>Related to</option>
									<option>Parent of</option>
									<option>Child of</option>
									<option>Supersedes</option>
									<option>Superseded by</option>
								</select>
							</div>
							<div>
								<label class="block text-sm font-medium text-gray-700 mb-1">Target Plan</label>
								<select class="w-full px-3 py-2 border border-gray-300 rounded-md">
									<option>Select plan...</option>
									<option>432367-2 - Plan of Survey - Lot 2</option>
									<option>H123456 - Historical Cadastral Plan</option>
								</select>
							</div>
						</div>
						<button class="mt-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
							Add Relationship
						</button>
					</div>
				</div>
				
				<div class="flex justify-end space-x-3 mt-6">
					<button 
						on:click={() => showRelationshipModal = false}
						class="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
					>
						Close
					</button>
				</div>
			</div>
		</div>
	{/if}
</div>