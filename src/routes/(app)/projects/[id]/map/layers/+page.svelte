<script lang="ts">
	import { onMount } from 'svelte'
	import { page } from '$app/stores'
	import { goto } from '$app/navigation'
	import { 
		ArrowLeft,
		Plus,
		Edit3,
		Trash2,
		Eye,
		EyeOff,
		Globe,
		Info,
		AlertTriangle,
		CheckCircle,
		RefreshCw
	} from 'lucide-svelte'
	
	const projectId = $page.params.id
	
	type WMSLayer = {
		id: string
		name: string
		url: string
		layers: string
		format: string
		version: string
		crs: string
		category: string
		attribution?: string
		description?: string
		isEnabled: boolean
		isSystem: boolean
		status: 'active' | 'error' | 'testing'
		lastTested?: string
		error?: string
	}
	
	let wmsLayers: WMSLayer[] = []
	let showAddForm = false
	let editingLayer: WMSLayer | null = null
	let testingLayers = new Set<string>()
	
	// Form state
	let layerForm = {
		name: '',
		url: '',
		layers: '',
		format: 'image/png',
		version: '1.1.1',
		crs: 'EPSG:4326',
		category: 'Custom',
		attribution: '',
		description: ''
	}
	
	// Available WMS versions and formats
	const wmsVersions = ['1.1.1', '1.3.0']
	const wmsFormats = ['image/png', 'image/jpeg', 'image/gif']
	const crsSystems = ['EPSG:4326', 'EPSG:3857', 'EPSG:28355']
	const categories = ['Cadastral', 'Topographic', 'Geological', 'Administrative', 'Custom']
	
	onMount(() => {
		loadWMSLayers()
	})
	
	async function loadWMSLayers() {
		try {
			// TODO: Load from Supabase
			// Mock data with Tasmania government WMS services
			wmsLayers = [
				{
					id: 'list-cadastre',
					name: 'LIST Cadastre',
					url: 'https://services.thelist.tas.gov.au/arcgis/services/Public/CadastreAndAdministrative/MapServer/WMSServer',
					layers: 'Parcels,Boundaries',
					format: 'image/png',
					version: '1.1.1',
					crs: 'EPSG:4326',
					category: 'Cadastral',
					attribution: 'Land Information System Tasmania',
					description: 'Tasmanian cadastral boundaries and property parcels',
					isEnabled: true,
					isSystem: true,
					status: 'active',
					lastTested: '2024-01-15T10:00:00Z'
				},
				{
					id: 'list-admin',
					name: 'Administrative Boundaries',
					url: 'https://services.thelist.tas.gov.au/arcgis/services/Public/CadastreAndAdministrative/MapServer/WMSServer',
					layers: 'Local_Government_Areas',
					format: 'image/png',
					version: '1.1.1',
					crs: 'EPSG:4326',
					category: 'Administrative',
					attribution: 'Land Information System Tasmania',
					description: 'Local government areas and administrative boundaries',
					isEnabled: true,
					isSystem: true,
					status: 'active',
					lastTested: '2024-01-15T10:00:00Z'
				},
				{
					id: 'mrt-geology',
					name: 'Geology',
					url: 'https://www.mrt.tas.gov.au/erdas-iws/ogc/wms/',
					layers: 'GeologyPolygons',
					format: 'image/png',
					version: '1.1.1',
					crs: 'EPSG:4326',
					category: 'Geological',
					attribution: 'Mineral Resources Tasmania',
					description: 'Geological formations and rock types',
					isEnabled: false,
					isSystem: true,
					status: 'active',
					lastTested: '2024-01-15T10:00:00Z'
				}
			]
		} catch (error) {
			// Failed to load WMS layers
		}
	}
	
	function openAddForm() {
		showAddForm = true
		editingLayer = null
		resetForm()
	}
	
	function editLayer(layer: WMSLayer) {
		if (layer.isSystem) return // Prevent editing system layers
		
		editingLayer = layer
		showAddForm = true
		
		layerForm = {
			name: layer.name,
			url: layer.url,
			layers: layer.layers,
			format: layer.format,
			version: layer.version,
			crs: layer.crs,
			category: layer.category,
			attribution: layer.attribution || '',
			description: layer.description || ''
		}
	}
	
	function closeForm() {
		showAddForm = false
		editingLayer = null
		resetForm()
	}
	
	function resetForm() {
		layerForm = {
			name: '',
			url: '',
			layers: '',
			format: 'image/png',
			version: '1.1.1',
			crs: 'EPSG:4326',
			category: 'Custom',
			attribution: '',
			description: ''
		}
	}
	
	async function saveLayer() {
		try {
			if (editingLayer) {
				// Update existing layer
				const index = wmsLayers.findIndex(l => l.id === editingLayer.id)
				if (index !== -1) {
					wmsLayers[index] = {
						...wmsLayers[index],
						...layerForm
					}
				}
			} else {
				// Add new layer
				const newLayer: WMSLayer = {
					id: `custom-${Date.now()}`,
					...layerForm,
					isEnabled: true,
					isSystem: false,
					status: 'testing'
				}
				wmsLayers = [...wmsLayers, newLayer]
			}
			
			// TODO: Save to Supabase
			
			closeForm()
		} catch (error) {
			alert('Failed to save layer. Please try again.')
		}
	}
	
	async function deleteLayer(layerId: string) {
		const layer = wmsLayers.find(l => l.id === layerId)
		if (!layer || layer.isSystem) return
		
		if (!confirm(`Delete the layer "${layer.name}"? This cannot be undone.`)) {
			return
		}
		
		try {
			wmsLayers = wmsLayers.filter(l => l.id !== layerId)
			// TODO: Delete from Supabase
		} catch (error) {
			alert('Failed to delete layer. Please try again.')
		}
	}
	
	async function toggleLayer(layerId: string) {
		const layer = wmsLayers.find(l => l.id === layerId)
		if (!layer) return
		
		layer.isEnabled = !layer.isEnabled
		wmsLayers = wmsLayers
		
		// TODO: Save to Supabase
	}
	
	async function testLayer(layerId: string) {
		const layer = wmsLayers.find(l => l.id === layerId)
		if (!layer) return
		
		testingLayers.add(layerId)
		layer.status = 'testing'
		layer.error = undefined
		wmsLayers = wmsLayers
		
		try {
			// TODO: Implement actual WMS GetCapabilities test
			await new Promise(resolve => setTimeout(resolve, 2000)) // Mock delay
			
			// Mock successful test
			layer.status = 'active'
			layer.lastTested = new Date().toISOString()
		} catch (error) {
			layer.status = 'error'
			layer.error = 'Failed to connect to WMS service'
		} finally {
			testingLayers.delete(layerId)
			wmsLayers = wmsLayers
		}
	}
	
	function getStatusIcon(status: string) {
		switch (status) {
			case 'active': return CheckCircle
			case 'error': return AlertTriangle
			case 'testing': return RefreshCw
			default: return Info
		}
	}
	
	function getStatusColor(status: string) {
		switch (status) {
			case 'active': return 'text-green-500'
			case 'error': return 'text-red-500'
			case 'testing': return 'text-blue-500'
			default: return 'text-gray-500'
		}
	}
	
	function formatDate(dateString: string): string {
		return new Date(dateString).toLocaleDateString('en-AU', {
			year: 'numeric',
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		})
	}
	
	// Group layers by category
	$: layersByCategory = wmsLayers.reduce((acc, layer) => {
		if (!acc[layer.category]) {
			acc[layer.category] = []
		}
		acc[layer.category].push(layer)
		return acc
	}, {} as Record<string, WMSLayer[]>)
</script>

<svelte:head>
	<title>Layer Management - TasFieldbook</title>
</svelte:head>

<div class="min-h-screen bg-gray-50">
	<!-- Header -->
	<div class="bg-white border-b border-gray-200">
		<div class="max-w-6xl mx-auto px-4 py-4">
			<div class="flex items-center justify-between">
				<div class="flex items-center space-x-4">
					<button
						on:click={() => goto(`/projects/${projectId}/map`)}
						class="flex items-center space-x-2 text-gray-600 hover:text-gray-800"
					>
						<ArrowLeft class="w-5 h-5" />
						<span>Back to Map</span>
					</button>
					
					<div class="border-l border-gray-300 pl-4">
						<h1 class="text-xl font-semibold text-gray-900">Layer Management</h1>
						<p class="text-sm text-gray-500">Configure WMS layers and data sources</p>
					</div>
				</div>
				
				<button
					on:click={openAddForm}
					class="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
				>
					<Plus class="w-4 h-4" />
					<span>Add Layer</span>
				</button>
			</div>
		</div>
	</div>
	
	<!-- Layer List -->
	<div class="max-w-6xl mx-auto px-4 py-8">
		{#each Object.entries(layersByCategory) as [category, layers]}
			<div class="mb-8">
				<h2 class="text-lg font-medium text-gray-900 mb-4 flex items-center space-x-2">
					<Globe class="w-5 h-5 text-purple-500" />
					<span>{category} Layers</span>
					<span class="text-sm font-normal text-gray-500">({layers.length})</span>
				</h2>
				
				<div class="bg-white rounded-lg shadow overflow-hidden">
					<div class="divide-y divide-gray-200">
						{#each layers as layer}
							<div class="p-6">
								<div class="flex items-start justify-between">
									<div class="flex-1 min-w-0">
										<div class="flex items-center space-x-3 mb-2">
											<button
												on:click={() => toggleLayer(layer.id)}
												class="flex items-center space-x-2"
											>
												{#if layer.isEnabled}
													<Eye class="w-4 h-4 text-green-500" />
												{:else}
													<EyeOff class="w-4 h-4 text-gray-400" />
												{/if}
											</button>
											
											<h3 class="text-lg font-medium text-gray-900">{layer.name}</h3>
											
											<div class="flex items-center space-x-1">
												<svelte:component 
													this={getStatusIcon(layer.status)} 
													class="w-4 h-4 {getStatusColor(layer.status)} {layer.status === 'testing' ? 'animate-spin' : ''}" 
												/>
												<span class="text-xs text-gray-500 capitalize">{layer.status}</span>
											</div>
											
											{#if layer.isSystem}
												<span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
													System
												</span>
											{/if}
										</div>
										
										{#if layer.description}
											<p class="text-sm text-gray-600 mb-3">{layer.description}</p>
										{/if}
										
										<div class="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
											<div>
												<span class="font-medium text-gray-700">URL:</span>
												<p class="text-gray-600 break-all">{layer.url}</p>
											</div>
											
											<div>
												<span class="font-medium text-gray-700">Layers:</span>
												<p class="text-gray-600">{layer.layers}</p>
											</div>
											
											<div>
												<span class="font-medium text-gray-700">Format:</span>
												<p class="text-gray-600">{layer.format} • {layer.version} • {layer.crs}</p>
											</div>
										</div>
										
										{#if layer.attribution}
											<div class="mt-3 text-sm">
												<span class="font-medium text-gray-700">Attribution:</span>
												<span class="text-gray-600">{layer.attribution}</span>
											</div>
										{/if}
										
										{#if layer.error}
											<div class="mt-3 p-3 bg-red-50 border border-red-200 rounded-md">
												<p class="text-sm text-red-800">{layer.error}</p>
											</div>
										{/if}
										
										{#if layer.lastTested}
											<div class="mt-3 text-xs text-gray-500">
												Last tested: {formatDate(layer.lastTested)}
											</div>
										{/if}
									</div>
									
									<div class="flex items-center space-x-2 ml-4">
										<button
											on:click={() => testLayer(layer.id)}
											disabled={testingLayers.has(layer.id)}
											class="p-2 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100"
											title="Test Connection"
										>
											<RefreshCw class="w-4 h-4 {testingLayers.has(layer.id) ? 'animate-spin' : ''}" />
										</button>
										
										{#if !layer.isSystem}
											<button
												on:click={() => editLayer(layer)}
												class="p-2 text-gray-400 hover:text-purple-600 rounded-md hover:bg-gray-100"
												title="Edit Layer"
											>
												<Edit3 class="w-4 h-4" />
											</button>
											
											<button
												on:click={() => deleteLayer(layer.id)}
												class="p-2 text-gray-400 hover:text-red-600 rounded-md hover:bg-gray-100"
												title="Delete Layer"
											>
												<Trash2 class="w-4 h-4" />
											</button>
										{/if}
									</div>
								</div>
							</div>
						{/each}
					</div>
				</div>
			</div>
		{/each}
		
		{#if wmsLayers.length === 0}
			<div class="text-center py-12">
				<Globe class="w-12 h-12 text-gray-400 mx-auto mb-4" />
				<h3 class="text-lg font-medium text-gray-900 mb-2">No WMS layers configured</h3>
				<p class="text-gray-600 mb-4">Add your first WMS layer to start displaying geospatial data.</p>
				<button
					on:click={openAddForm}
					class="inline-flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
				>
					<Plus class="w-4 h-4" />
					<span>Add Layer</span>
				</button>
			</div>
		{/if}
	</div>
</div>

<!-- Add/Edit Layer Modal -->
{#if showAddForm}
	<div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
		<div class="bg-white rounded-lg max-w-2xl w-full max-h-screen overflow-y-auto">
			<div class="px-6 py-4 border-b border-gray-200">
				<h3 class="text-lg font-medium text-gray-900">
					{editingLayer ? 'Edit WMS Layer' : 'Add WMS Layer'}
				</h3>
			</div>
			
			<div class="px-6 py-4 space-y-4">
				<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
					<div>
						<label class="block text-sm font-medium text-gray-700 mb-2">Layer Name</label>
						<input
							bind:value={layerForm.name}
							placeholder="Enter layer name"
							class="w-full px-3 py-2 border border-gray-300 rounded-md"
						/>
					</div>
					
					<div>
						<label class="block text-sm font-medium text-gray-700 mb-2">Category</label>
						<select bind:value={layerForm.category} class="w-full px-3 py-2 border border-gray-300 rounded-md">
							{#each categories as category}
								<option value={category}>{category}</option>
							{/each}
						</select>
					</div>
				</div>
				
				<div>
					<label class="block text-sm font-medium text-gray-700 mb-2">WMS Service URL</label>
					<input
						bind:value={layerForm.url}
						placeholder="https://example.com/wms"
						class="w-full px-3 py-2 border border-gray-300 rounded-md"
					/>
				</div>
				
				<div>
					<label class="block text-sm font-medium text-gray-700 mb-2">Layer Names</label>
					<input
						bind:value={layerForm.layers}
						placeholder="layer1,layer2,layer3"
						class="w-full px-3 py-2 border border-gray-300 rounded-md"
					/>
					<p class="text-xs text-gray-500 mt-1">Comma-separated list of layer names</p>
				</div>
				
				<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
					<div>
						<label class="block text-sm font-medium text-gray-700 mb-2">Format</label>
						<select bind:value={layerForm.format} class="w-full px-3 py-2 border border-gray-300 rounded-md">
							{#each wmsFormats as format}
								<option value={format}>{format}</option>
							{/each}
						</select>
					</div>
					
					<div>
						<label class="block text-sm font-medium text-gray-700 mb-2">Version</label>
						<select bind:value={layerForm.version} class="w-full px-3 py-2 border border-gray-300 rounded-md">
							{#each wmsVersions as version}
								<option value={version}>{version}</option>
							{/each}
						</select>
					</div>
					
					<div>
						<label class="block text-sm font-medium text-gray-700 mb-2">CRS</label>
						<select bind:value={layerForm.crs} class="w-full px-3 py-2 border border-gray-300 rounded-md">
							{#each crsSystems as crs}
								<option value={crs}>{crs}</option>
							{/each}
						</select>
					</div>
				</div>
				
				<div>
					<label class="block text-sm font-medium text-gray-700 mb-2">Attribution</label>
					<input
						bind:value={layerForm.attribution}
						placeholder="Data source attribution"
						class="w-full px-3 py-2 border border-gray-300 rounded-md"
					/>
				</div>
				
				<div>
					<label class="block text-sm font-medium text-gray-700 mb-2">Description</label>
					<textarea
						bind:value={layerForm.description}
						placeholder="Layer description"
						rows="3"
						class="w-full px-3 py-2 border border-gray-300 rounded-md resize-none"
					></textarea>
				</div>
			</div>
			
			<div class="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
				<button
					on:click={closeForm}
					class="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
				>
					Cancel
				</button>
				<button
					on:click={saveLayer}
					disabled={!layerForm.name || !layerForm.url || !layerForm.layers}
					class="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
				>
					{editingLayer ? 'Update' : 'Add'} Layer
				</button>
			</div>
		</div>
	</div>
{/if}