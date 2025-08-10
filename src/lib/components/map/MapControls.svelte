<script lang="ts">
	import { onMount } from 'svelte'
	import { 
		Eye, 
		EyeOff, 
		Settings, 
		Plus,
		Minus,
		RefreshCw,
		Download
	} from 'lucide-svelte'
	
	export let projectId: string
	export let mapContainer: any
	
	// WMS Layer definitions for Tasmania
	let wmsLayers = [
		{
			id: 'list-cadastre',
			name: 'LIST Cadastre',
			url: 'https://services.thelist.tas.gov.au/arcgis/services/Public/CadastreAndAdministrative/MapServer/WMSServer',
			layers: 'Parcels,Boundaries',
			category: 'Cadastral',
			visible: false,
			opacity: 0.8,
			loading: false,
			error: null
		},
		{
			id: 'list-admin',
			name: 'Administrative Boundaries',
			url: 'https://services.thelist.tas.gov.au/arcgis/services/Public/CadastreAndAdministrative/MapServer/WMSServer',
			layers: 'Local_Government_Areas',
			category: 'Administrative',
			visible: false,
			opacity: 0.7,
			loading: false,
			error: null
		},
		{
			id: 'mrt-geology',
			name: 'Geology',
			url: 'https://www.mrt.tas.gov.au/erdas-iws/ogc/wms/',
			layers: 'GeologyPolygons',
			category: 'Geological',
			visible: false,
			opacity: 0.6,
			loading: false,
			error: null
		}
	]
	
	let expandedCategories: Set<string> = new Set(['Cadastral'])
	let customWMSUrl = ''
	let customWMSLayers = ''
	let showAddWMS = false
	
	onMount(() => {
		// Load saved layer configuration
		loadLayerConfiguration()
	})
	
	function toggleCategory(category: string) {
		if (expandedCategories.has(category)) {
			expandedCategories.delete(category)
		} else {
			expandedCategories.add(category)
		}
		expandedCategories = expandedCategories
	}
	
	async function toggleLayer(layer: any) {
		if (!mapContainer) return
		
		layer.loading = true
		layer.error = null
		
		try {
			if (layer.visible) {
				mapContainer.toggleLayer(layer.id, false)
				layer.visible = false
			} else {
				await mapContainer.addWMSLayer(layer.name, layer.url, layer.layers, {
					opacity: layer.opacity
				})
				mapContainer.toggleLayer(layer.id, true)
				layer.visible = true
			}
		} catch (error) {
			layer.error = 'Failed to load layer'
		} finally {
			layer.loading = false
		}
		
		// Save configuration
		saveLayerConfiguration()
	}
	
	function updateOpacity(layer: any, opacity: number) {
		layer.opacity = opacity
		if (layer.visible && mapContainer) {
			mapContainer.setLayerOpacity(layer.id, opacity)
		}
		saveLayerConfiguration()
	}
	
	async function addCustomWMS() {
		if (!customWMSUrl || !customWMSLayers) return
		
		const newLayer = {
			id: `custom-${Date.now()}`,
			name: `Custom WMS`,
			url: customWMSUrl,
			layers: customWMSLayers,
			category: 'Custom',
			visible: false,
			opacity: 0.8,
			loading: false,
			error: null
		}
		
		wmsLayers = [...wmsLayers, newLayer]
		customWMSUrl = ''
		customWMSLayers = ''
		showAddWMS = false
		
		saveLayerConfiguration()
	}
	
	function removeLayer(layerId: string) {
		const layer = wmsLayers.find(l => l.id === layerId)
		if (layer && layer.visible && mapContainer) {
			mapContainer.toggleLayer(layerId, false)
		}
		wmsLayers = wmsLayers.filter(l => l.id !== layerId)
		saveLayerConfiguration()
	}
	
	function refreshLayer(layer: any) {
		if (!layer.visible || !mapContainer) return
		
		// Remove and re-add layer to refresh
		mapContainer.toggleLayer(layer.id, false)
		setTimeout(() => {
			mapContainer.addWMSLayer(layer.name, layer.url, layer.layers, {
				opacity: layer.opacity
			})
			mapContainer.toggleLayer(layer.id, true)
		}, 100)
	}
	
	function loadLayerConfiguration() {
		// TODO: Load from Supabase or localStorage
		const saved = localStorage.getItem(`map-layers-${projectId}`)
		if (saved) {
			try {
				const config = JSON.parse(saved)
				wmsLayers = wmsLayers.map(layer => ({
					...layer,
					...config.find((c: any) => c.id === layer.id)
				}))
			} catch (error) {
				// Failed to load layer configuration
			}
		}
	}
	
	function saveLayerConfiguration() {
		// TODO: Save to Supabase
		const config = wmsLayers.map(({ id, visible, opacity }) => ({ id, visible, opacity }))
		localStorage.setItem(`map-layers-${projectId}`, JSON.stringify(config))
	}
	
	function exportConfiguration() {
		const config = {
			projectId,
			layers: wmsLayers,
			timestamp: new Date().toISOString()
		}
		
		const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' })
		const url = URL.createObjectURL(blob)
		const a = document.createElement('a')
		a.href = url
		a.download = `map-config-${projectId}.json`
		a.click()
		URL.revokeObjectURL(url)
	}
	
	// Group layers by category
	$: layersByCategory = wmsLayers.reduce((acc, layer) => {
		if (!acc[layer.category]) {
			acc[layer.category] = []
		}
		acc[layer.category].push(layer)
		return acc
	}, {} as Record<string, typeof wmsLayers>)
</script>

<div class="h-full flex flex-col">
	<!-- Header -->
	<div class="p-4 border-b border-gray-200">
		<div class="flex items-center justify-between mb-3">
			<h3 class="text-sm font-medium text-gray-900">Map Layers</h3>
			<div class="flex items-center space-x-1">
				<button
					on:click={() => showAddWMS = !showAddWMS}
					class="p-1 text-gray-400 hover:text-gray-600 rounded"
					title="Add Custom WMS"
				>
					<Plus class="w-4 h-4" />
				</button>
				<button
					on:click={exportConfiguration}
					class="p-1 text-gray-400 hover:text-gray-600 rounded"
					title="Export Configuration"
				>
					<Download class="w-4 h-4" />
				</button>
			</div>
		</div>
		
		<!-- Add Custom WMS Form -->
		{#if showAddWMS}
			<div class="space-y-2 p-3 bg-gray-50 rounded-lg">
				<input
					bind:value={customWMSUrl}
					placeholder="WMS Service URL"
					class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
				/>
				<input
					bind:value={customWMSLayers}
					placeholder="Layer names (comma-separated)"
					class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
				/>
				<div class="flex justify-end space-x-2">
					<button
						on:click={() => showAddWMS = false}
						class="px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
					>
						Cancel
					</button>
					<button
						on:click={addCustomWMS}
						disabled={!customWMSUrl || !customWMSLayers}
						class="px-3 py-1 text-sm bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50"
					>
						Add
					</button>
				</div>
			</div>
		{/if}
	</div>
	
	<!-- Layer List -->
	<div class="flex-1 overflow-y-auto">
		{#each Object.entries(layersByCategory) as [category, layers]}
			<div class="border-b border-gray-100 last:border-b-0">
				<!-- Category Header -->
				<button
					on:click={() => toggleCategory(category)}
					class="w-full px-4 py-3 text-left flex items-center justify-between hover:bg-gray-50"
				>
					<span class="text-sm font-medium text-gray-700">{category}</span>
					<span class="text-gray-400 transform transition-transform {expandedCategories.has(category) ? 'rotate-90' : ''}">
						➤
					</span>
				</button>
				
				<!-- Category Layers -->
				{#if expandedCategories.has(category)}
					<div class="pb-2">
						{#each layers as layer}
							<div class="px-4 py-2 space-y-2">
								<!-- Layer Toggle -->
								<div class="flex items-center justify-between">
									<div class="flex items-center space-x-2 flex-1">
										<button
											on:click={() => toggleLayer(layer)}
											disabled={layer.loading}
											class="flex items-center space-x-2 text-sm {layer.visible ? 'text-purple-600' : 'text-gray-600'} hover:text-purple-700"
										>
											{#if layer.loading}
												<div class="w-4 h-4 border-2 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
											{:else if layer.visible}
												<Eye class="w-4 h-4" />
											{:else}
												<EyeOff class="w-4 h-4" />
											{/if}
											<span class="truncate">{layer.name}</span>
										</button>
									</div>
									
									<div class="flex items-center space-x-1">
										{#if layer.visible}
											<button
												on:click={() => refreshLayer(layer)}
												class="p-1 text-gray-400 hover:text-gray-600 rounded"
												title="Refresh Layer"
											>
												<RefreshCw class="w-3 h-3" />
											</button>
										{/if}
										
										{#if layer.category === 'Custom'}
											<button
												on:click={() => removeLayer(layer.id)}
												class="p-1 text-gray-400 hover:text-red-600 rounded"
												title="Remove Layer"
											>
												<Minus class="w-3 h-3" />
											</button>
										{/if}
									</div>
								</div>
								
								<!-- Layer Opacity -->
								{#if layer.visible}
									<div class="ml-6 flex items-center space-x-2">
										<span class="text-xs text-gray-500 w-12">Opacity</span>
										<input
											type="range"
											min="0"
											max="1"
											step="0.1"
											value={layer.opacity}
											on:input={(e) => updateOpacity(layer, parseFloat(e.target.value))}
											class="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
										/>
										<span class="text-xs text-gray-500 w-8">{Math.round(layer.opacity * 100)}%</span>
									</div>
								{/if}
								
								<!-- Layer Error -->
								{#if layer.error}
									<div class="ml-6 text-xs text-red-600 bg-red-50 px-2 py-1 rounded">
										{layer.error}
									</div>
								{/if}
							</div>
						{/each}
					</div>
				{/if}
			</div>
		{/each}
	</div>
	
	<!-- Footer -->
	<div class="p-4 border-t border-gray-200">
		<a 
			href="/projects/{projectId}/map/layers" 
			class="flex items-center space-x-2 text-sm text-purple-600 hover:text-purple-700"
		>
			<Settings class="w-4 h-4" />
			<span>Manage Layers</span>
		</a>
	</div>
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
</style>