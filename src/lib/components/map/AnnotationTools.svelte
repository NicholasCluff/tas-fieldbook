<script lang="ts">
	import { onMount } from 'svelte'
	import { 
		MousePointer2,
		MapPin,
		Minus,
		Square,
		Edit3,
		Trash2,
		Save,
		X,
		Palette,
		Type,
		Ruler
	} from 'lucide-svelte'
	
	export let projectId: string
	export let mapContainer: any
	
	type DrawingTool = 'select' | 'point' | 'line' | 'polygon' | 'edit'
	type Annotation = {
		id: string
		type: 'point' | 'line' | 'polygon'
		geometry: any
		properties: {
			label?: string
			description?: string
			color: string
			strokeWidth: number
			fillOpacity?: number
		}
		measurements?: {
			distance?: number
			area?: number
		}
		created_at: string
		user_id: string
	}
	
	let activeTool: DrawingTool = 'select'
	let annotations: Annotation[] = []
	let selectedAnnotation: Annotation | null = null
	let isEditing = false
	
	// Drawing options
	let drawingOptions = {
		color: '#3B82F6',
		strokeWidth: 2,
		fillOpacity: 0.3
	}
	
	// Form state
	let editForm = {
		label: '',
		description: '',
		color: '#3B82F6',
		strokeWidth: 2,
		fillOpacity: 0.3
	}
	
	let showColorPicker = false
	let showEditForm = false
	
	// Predefined colors
	const colors = [
		'#3B82F6', '#EF4444', '#10B981', '#F59E0B',
		'#8B5CF6', '#EC4899', '#14B8A6', '#F97316'
	]
	
	onMount(() => {
		loadAnnotations()
	})
	
	function selectTool(tool: DrawingTool) {
		activeTool = tool
		selectedAnnotation = null
		showEditForm = false
		
		if (mapContainer) {
			// TODO: Enable drawing mode on map
			// Tool selected: {tool}
		}
	}
	
	function selectAnnotation(annotation: Annotation) {
		selectedAnnotation = annotation
		activeTool = 'select'
		
		// Populate edit form
		editForm = {
			label: annotation.properties.label || '',
			description: annotation.properties.description || '',
			color: annotation.properties.color,
			strokeWidth: annotation.properties.strokeWidth,
			fillOpacity: annotation.properties.fillOpacity || 0.3
		}
		
		// Focus on annotation on map
		if (mapContainer) {
			// TODO: Center map on annotation
		}
	}
	
	function startEdit() {
		if (!selectedAnnotation) return
		isEditing = true
		showEditForm = true
	}
	
	function cancelEdit() {
		isEditing = false
		showEditForm = false
		if (selectedAnnotation) {
			// Reset form to original values
			editForm = {
				label: selectedAnnotation.properties.label || '',
				description: selectedAnnotation.properties.description || '',
				color: selectedAnnotation.properties.color,
				strokeWidth: selectedAnnotation.properties.strokeWidth,
				fillOpacity: selectedAnnotation.properties.fillOpacity || 0.3
			}
		}
	}
	
	async function saveAnnotation() {
		if (!selectedAnnotation) return
		
		try {
			// Update annotation properties
			selectedAnnotation.properties = {
				...selectedAnnotation.properties,
				...editForm
			}
			
			// TODO: Save to Supabase
			// Update annotations list
			annotations = annotations.map(a => 
				a.id === selectedAnnotation!.id ? selectedAnnotation! : a
			)
			
			isEditing = false
			showEditForm = false
			
			// Update map display
			if (mapContainer) {
				// TODO: Update annotation style on map
			}
		} catch (error) {
			// Failed to save annotation
		}
	}
	
	async function deleteAnnotation() {
		if (!selectedAnnotation) return
		
		if (!confirm('Are you sure you want to delete this annotation?')) {
			return
		}
		
		try {
			// TODO: Delete from Supabase
			// Remove from list
			annotations = annotations.filter(a => a.id !== selectedAnnotation!.id)
			
			// Remove from map
			if (mapContainer) {
				// TODO: Remove annotation from map
			}
			
			selectedAnnotation = null
			showEditForm = false
		} catch (error) {
			// Failed to delete annotation
		}
	}
	
	function setColor(color: string) {
		editForm.color = color
		drawingOptions.color = color
		showColorPicker = false
		
		if (isEditing && selectedAnnotation) {
			// Update preview on map
			// TODO: Update annotation style preview
		}
	}
	
	async function loadAnnotations() {
		try {
			// TODO: Load from Supabase
			// Mock data for development
			annotations = [
				{
					id: '1',
					type: 'point',
					geometry: { type: 'Point', coordinates: [145.9707, -41.4545] },
					properties: {
						label: 'Survey Point A',
						description: 'Primary reference point',
						color: '#3B82F6',
						strokeWidth: 2
					},
					created_at: '2024-01-15T10:30:00Z',
					user_id: 'user1'
				},
				{
					id: '2',
					type: 'line',
					geometry: { 
						type: 'LineString', 
						coordinates: [[145.9707, -41.4545], [145.9800, -41.4600]] 
					},
					properties: {
						label: 'Property Boundary',
						description: 'Northern boundary line',
						color: '#EF4444',
						strokeWidth: 3
					},
					measurements: {
						distance: 1250.5
					},
					created_at: '2024-01-15T11:00:00Z',
					user_id: 'user1'
				}
			]
		} catch (error) {
			// Failed to load annotations
		}
	}
	
	function formatMeasurement(value: number, type: 'distance' | 'area'): string {
		if (type === 'distance') {
			if (value < 1000) {
				return `${value.toFixed(1)} m`
			} else {
				return `${(value / 1000).toFixed(2)} km`
			}
		} else {
			if (value < 10000) {
				return `${value.toFixed(0)} m²`
			} else {
				return `${(value / 10000).toFixed(2)} ha`
			}
		}
	}
	
	function getToolIcon(tool: DrawingTool) {
		switch (tool) {
			case 'select': return MousePointer2
			case 'point': return MapPin
			case 'line': return Minus
			case 'polygon': return Square
			case 'edit': return Edit3
			default: return MousePointer2
		}
	}
</script>

<div class="h-full flex flex-col">
	<!-- Drawing Tools -->
	<div class="p-4 border-b border-gray-200">
		<h3 class="text-sm font-medium text-gray-900 mb-3">Drawing Tools</h3>
		
		<div class="grid grid-cols-2 gap-2">
			{#each [
				{ tool: 'select', label: 'Select', icon: MousePointer2 },
				{ tool: 'point', label: 'Point', icon: MapPin },
				{ tool: 'line', label: 'Line', icon: Minus },
				{ tool: 'polygon', label: 'Polygon', icon: Square }
			] as { tool, label, icon }}
				<button
					on:click={() => selectTool(tool)}
					class="flex items-center justify-center p-2 border rounded-md text-sm transition-colors {activeTool === tool ? 'border-purple-500 bg-purple-50 text-purple-700' : 'border-gray-300 hover:bg-gray-50'}"
				>
					<svelte:component this={icon} class="w-4 h-4 mr-1" />
					{label}
				</button>
			{/each}
		</div>
	</div>
	
	<!-- Drawing Options -->
	<div class="p-4 border-b border-gray-200">
		<h4 class="text-sm font-medium text-gray-900 mb-3">Style Options</h4>
		
		<div class="space-y-3">
			<!-- Color Picker -->
			<div class="relative">
				<label class="block text-xs text-gray-500 mb-1">Color</label>
				<button
					on:click={() => showColorPicker = !showColorPicker}
					class="w-full flex items-center justify-between p-2 border border-gray-300 rounded-md"
				>
					<div class="flex items-center space-x-2">
						<div class="w-4 h-4 rounded border border-gray-300" style="background-color: {drawingOptions.color}"></div>
						<span class="text-sm">{drawingOptions.color}</span>
					</div>
					<Palette class="w-4 h-4 text-gray-400" />
				</button>
				
				{#if showColorPicker}
					<div class="absolute top-full mt-1 left-0 right-0 bg-white border border-gray-300 rounded-md shadow-lg z-10 p-3">
						<div class="grid grid-cols-4 gap-2">
							{#each colors as color}
								<button
									on:click={() => setColor(color)}
									class="w-8 h-8 rounded border-2 {color === drawingOptions.color ? 'border-gray-800' : 'border-gray-300'}"
									style="background-color: {color}"
								></button>
							{/each}
						</div>
					</div>
				{/if}
			</div>
			
			<!-- Stroke Width -->
			<div>
				<label class="block text-xs text-gray-500 mb-1">Stroke Width</label>
				<input
					type="range"
					min="1"
					max="10"
					bind:value={drawingOptions.strokeWidth}
					class="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
				/>
				<div class="flex justify-between text-xs text-gray-500 mt-1">
					<span>1px</span>
					<span>{drawingOptions.strokeWidth}px</span>
					<span>10px</span>
				</div>
			</div>
			
			<!-- Fill Opacity (for polygons) -->
			{#if activeTool === 'polygon'}
				<div>
					<label class="block text-xs text-gray-500 mb-1">Fill Opacity</label>
					<input
						type="range"
						min="0"
						max="1"
						step="0.1"
						bind:value={drawingOptions.fillOpacity}
						class="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
					/>
					<div class="flex justify-between text-xs text-gray-500 mt-1">
						<span>0%</span>
						<span>{Math.round(drawingOptions.fillOpacity * 100)}%</span>
						<span>100%</span>
					</div>
				</div>
			{/if}
		</div>
	</div>
	
	<!-- Annotations List -->
	<div class="flex-1 overflow-y-auto">
		<div class="p-4">
			<div class="flex items-center justify-between mb-3">
				<h4 class="text-sm font-medium text-gray-900">Annotations</h4>
				<span class="text-xs text-gray-500">{annotations.length} items</span>
			</div>
			
			{#if annotations.length === 0}
				<p class="text-sm text-gray-500 text-center py-8">
					No annotations yet. Use the drawing tools to create annotations on the map.
				</p>
			{:else}
				<div class="space-y-2">
					{#each annotations as annotation}
						<div 
							class="p-3 border border-gray-200 rounded-lg cursor-pointer transition-colors {selectedAnnotation?.id === annotation.id ? 'border-purple-500 bg-purple-50' : 'hover:bg-gray-50'}"
							on:click={() => selectAnnotation(annotation)}
						>
							<div class="flex items-start justify-between">
								<div class="flex-1 min-w-0">
									<div class="flex items-center space-x-2 mb-1">
										<div class="w-3 h-3 rounded border border-gray-300" style="background-color: {annotation.properties.color}"></div>
										<span class="text-sm font-medium text-gray-900 truncate">
											{annotation.properties.label || `${annotation.type.charAt(0).toUpperCase() + annotation.type.slice(1)} Annotation`}
										</span>
									</div>
									
									{#if annotation.properties.description}
										<p class="text-xs text-gray-500 mb-2 line-clamp-2">{annotation.properties.description}</p>
									{/if}
									
									{#if annotation.measurements}
										<div class="flex items-center space-x-3 text-xs text-gray-500">
											{#if annotation.measurements.distance}
												<div class="flex items-center space-x-1">
													<Ruler class="w-3 h-3" />
													<span>{formatMeasurement(annotation.measurements.distance, 'distance')}</span>
												</div>
											{/if}
											{#if annotation.measurements.area}
												<div class="flex items-center space-x-1">
													<Square class="w-3 h-3" />
													<span>{formatMeasurement(annotation.measurements.area, 'area')}</span>
												</div>
											{/if}
										</div>
									{/if}
								</div>
								
								{#if selectedAnnotation?.id === annotation.id}
									<div class="flex items-center space-x-1 ml-2">
										<button
											on:click|stopPropagation={startEdit}
											class="p-1 text-gray-400 hover:text-purple-600 rounded"
											title="Edit"
										>
											<Edit3 class="w-3 h-3" />
										</button>
										<button
											on:click|stopPropagation={deleteAnnotation}
											class="p-1 text-gray-400 hover:text-red-600 rounded"
											title="Delete"
										>
											<Trash2 class="w-3 h-3" />
										</button>
									</div>
								{/if}
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</div>
	</div>
	
	<!-- Edit Form -->
	{#if showEditForm && selectedAnnotation}
		<div class="border-t border-gray-200 p-4 bg-gray-50">
			<div class="flex items-center justify-between mb-3">
				<h4 class="text-sm font-medium text-gray-900">Edit Annotation</h4>
				<button
					on:click={cancelEdit}
					class="p-1 text-gray-400 hover:text-gray-600 rounded"
				>
					<X class="w-4 h-4" />
				</button>
			</div>
			
			<div class="space-y-3">
				<div>
					<label class="block text-xs text-gray-500 mb-1">Label</label>
					<input
						bind:value={editForm.label}
						placeholder="Enter label"
						class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
					/>
				</div>
				
				<div>
					<label class="block text-xs text-gray-500 mb-1">Description</label>
					<textarea
						bind:value={editForm.description}
						placeholder="Enter description"
						rows="2"
						class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm resize-none"
					></textarea>
				</div>
				
				<div class="flex justify-end space-x-2">
					<button
						on:click={cancelEdit}
						class="px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
					>
						Cancel
					</button>
					<button
						on:click={saveAnnotation}
						class="px-3 py-1 text-sm bg-purple-600 text-white rounded hover:bg-purple-700"
					>
						Save
					</button>
				</div>
			</div>
		</div>
	{/if}
</div>

<style>
	.slider::-webkit-slider-thumb {
		appearance: none;
		height: 16px;
		width: 16px;
		border-radius: 50%;
		background: #7c3aed;
		cursor: pointer;
	}
	
	.slider::-moz-range-thumb {
		height: 16px;
		width: 16px;
		border-radius: 50%;
		background: #7c3aed;
		cursor: pointer;
		border: none;
	}
	
	.line-clamp-2 {
		display: -webkit-box;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}
</style>