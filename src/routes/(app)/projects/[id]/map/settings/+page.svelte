<script lang="ts">
	import { onMount } from 'svelte'
	import { page } from '$app/stores'
	import { goto } from '$app/navigation'
	import { 
		ArrowLeft,
		Save,
		RotateCcw,
		Download,
		Upload,
		Trash2,
		MapPin,
		Layers,
		Palette,
		Grid,
		Navigation
	} from 'lucide-svelte'
	
	const projectId = $page.params.id
	
	// Map configuration state
	let mapConfig = {
		// Default map view
		defaultCenter: { lat: -41.4545, lng: 145.9707 },
		defaultZoom: 10,
		minZoom: 5,
		maxZoom: 20,
		
		// Base layer preferences
		defaultBaseLayer: 'osm',
		availableBaseLayers: {
			osm: { name: 'OpenStreetMap', enabled: true },
			satellite: { name: 'Satellite Imagery', enabled: true },
			topographic: { name: 'Topographic', enabled: true }
		},
		
		// Display preferences
		showScale: true,
		showCoordinates: true,
		showMinimap: false,
		showFullscreenControl: true,
		showLocationControl: true,
		
		// Drawing defaults
		defaultAnnotationColor: '#3B82F6',
		defaultStrokeWidth: 2,
		defaultFillOpacity: 0.3,
		snapToGrid: false,
		gridSize: 10,
		
		// Measurement units
		distanceUnit: 'metric', // 'metric' or 'imperial'
		areaUnit: 'metric',
		coordinateFormat: 'decimal', // 'decimal', 'dms', 'utm'
		
		// Performance settings
		clusterPhotos: true,
		clusterRadius: 50,
		maxClusterSize: 10,
		simplifyGeometry: true,
		
		// WMS settings
		wmsTimeout: 10000,
		wmsVersion: '1.1.1',
		wmsFormat: 'image/png',
		
		// Offline settings
		enableOfflineMode: false,
		maxOfflineZoom: 16,
		offlineRegions: []
	}
	
	let originalConfig = { ...mapConfig }
	let hasChanges = false
	let saving = false
	let importing = false
	let exporting = false
	
	// Available coordinate formats
	const coordinateFormats = [
		{ value: 'decimal', label: 'Decimal Degrees (DD)' },
		{ value: 'dms', label: 'Degrees Minutes Seconds (DMS)' },
		{ value: 'utm', label: 'Universal Transverse Mercator (UTM)' }
	]
	
	// Available distance/area units
	const units = [
		{ value: 'metric', label: 'Metric (m, km, ha)' },
		{ value: 'imperial', label: 'Imperial (ft, mi, ac)' }
	]
	
	onMount(() => {
		loadMapConfiguration()
	})
	
	// Watch for changes
	$: {
		hasChanges = JSON.stringify(mapConfig) !== JSON.stringify(originalConfig)
	}
	
	async function loadMapConfiguration() {
		try {
			// TODO: Load from Supabase
			// Load from localStorage as fallback
			const saved = localStorage.getItem(`map-settings-${projectId}`)
			if (saved) {
				const parsed = JSON.parse(saved)
				mapConfig = { ...mapConfig, ...parsed }
			}
			
			originalConfig = JSON.parse(JSON.stringify(mapConfig))
		} catch (error) {
			// Failed to load map configuration
		}
	}
	
	async function saveConfiguration() {
		saving = true
		
		try {
			// TODO: Save to Supabase
			// Save to localStorage as fallback
			localStorage.setItem(`map-settings-${projectId}`, JSON.stringify(mapConfig))
			
			originalConfig = JSON.parse(JSON.stringify(mapConfig))
			hasChanges = false
			
			// Show success message
			alert('Map settings saved successfully!')
		} catch (error) {
			alert('Failed to save map settings. Please try again.')
		} finally {
			saving = false
		}
	}
	
	function resetToDefaults() {
		if (!confirm('Reset all settings to default values? This cannot be undone.')) {
			return
		}
		
		mapConfig = {
			defaultCenter: { lat: -41.4545, lng: 145.9707 },
			defaultZoom: 10,
			minZoom: 5,
			maxZoom: 20,
			defaultBaseLayer: 'osm',
			availableBaseLayers: {
				osm: { name: 'OpenStreetMap', enabled: true },
				satellite: { name: 'Satellite Imagery', enabled: true },
				topographic: { name: 'Topographic', enabled: true }
			},
			showScale: true,
			showCoordinates: true,
			showMinimap: false,
			showFullscreenControl: true,
			showLocationControl: true,
			defaultAnnotationColor: '#3B82F6',
			defaultStrokeWidth: 2,
			defaultFillOpacity: 0.3,
			snapToGrid: false,
			gridSize: 10,
			distanceUnit: 'metric',
			areaUnit: 'metric',
			coordinateFormat: 'decimal',
			clusterPhotos: true,
			clusterRadius: 50,
			maxClusterSize: 10,
			simplifyGeometry: true,
			wmsTimeout: 10000,
			wmsVersion: '1.1.1',
			wmsFormat: 'image/png',
			enableOfflineMode: false,
			maxOfflineZoom: 16,
			offlineRegions: []
		}
	}
	
	async function exportConfiguration() {
		exporting = true
		
		try {
			const exportData = {
				projectId,
				mapConfiguration: mapConfig,
				exportedAt: new Date().toISOString(),
				version: '1.0'
			}
			
			const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
			const url = URL.createObjectURL(blob)
			const a = document.createElement('a')
			a.href = url
			a.download = `map-settings-${projectId}.json`
			a.click()
			URL.revokeObjectURL(url)
		} catch (error) {
			alert('Failed to export configuration.')
		} finally {
			exporting = false
		}
	}
	
	async function importConfiguration() {
		importing = true
		
		try {
			const input = document.createElement('input')
			input.type = 'file'
			input.accept = '.json'
			
			input.onchange = async (e) => {
				const file = (e.target as HTMLInputElement).files?.[0]
				if (!file) return
				
				try {
					const text = await file.text()
					const importData = JSON.parse(text)
					
					if (importData.mapConfiguration) {
						mapConfig = { ...mapConfig, ...importData.mapConfiguration }
						alert('Configuration imported successfully!')
					} else {
						alert('Invalid configuration file format.')
					}
				} catch (error) {
					alert('Failed to import configuration file.')
				} finally {
					importing = false
				}
			}
			
			input.click()
		} catch (error) {
			// Failed to import configuration
			importing = false
		}
	}
	
	function updateCoordinates(field: 'lat' | 'lng', value: string) {
		const num = parseFloat(value)
		if (!isNaN(num)) {
			mapConfig.defaultCenter[field] = num
		}
	}
</script>

<svelte:head>
	<title>Map Settings - TasFieldbook</title>
</svelte:head>

<div class="min-h-screen bg-gray-50">
	<!-- Header -->
	<div class="bg-white border-b border-gray-200">
		<div class="max-w-4xl mx-auto px-4 py-4">
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
						<h1 class="text-xl font-semibold text-gray-900">Map Settings</h1>
						<p class="text-sm text-gray-500">Configure map display and behavior preferences</p>
					</div>
				</div>
				
				<div class="flex items-center space-x-2">
					<button
						on:click={exportConfiguration}
						disabled={exporting}
						class="flex items-center space-x-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-md"
					>
						<Download class="w-4 h-4" />
						<span>Export</span>
					</button>
					
					<button
						on:click={importConfiguration}
						disabled={importing}
						class="flex items-center space-x-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-md"
					>
						<Upload class="w-4 h-4" />
						<span>Import</span>
					</button>
					
					<button
						on:click={resetToDefaults}
						class="flex items-center space-x-2 px-3 py-2 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md"
					>
						<RotateCcw class="w-4 h-4" />
						<span>Reset</span>
					</button>
					
					<button
						on:click={saveConfiguration}
						disabled={!hasChanges || saving}
						class="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
					>
						<Save class="w-4 h-4" />
						<span>{saving ? 'Saving...' : 'Save'}</span>
					</button>
				</div>
			</div>
		</div>
	</div>
	
	<!-- Settings Content -->
	<div class="max-w-4xl mx-auto px-4 py-8">
		<div class="space-y-8">
			<!-- Default View Settings -->
			<div class="bg-white rounded-lg shadow">
				<div class="px-6 py-4 border-b border-gray-200">
					<div class="flex items-center space-x-2">
						<MapPin class="w-5 h-5 text-purple-500" />
						<h2 class="text-lg font-medium text-gray-900">Default Map View</h2>
					</div>
					<p class="text-sm text-gray-500 mt-1">Set the initial map center and zoom level</p>
				</div>
				
				<div class="px-6 py-4 space-y-4">
					<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
						<div>
							<label class="block text-sm font-medium text-gray-700 mb-2">Center Latitude</label>
							<input
								type="number"
								step="0.000001"
								value={mapConfig.defaultCenter.lat}
								on:input={(e) => updateCoordinates('lat', e.target.value)}
								class="w-full px-3 py-2 border border-gray-300 rounded-md"
							/>
						</div>
						
						<div>
							<label class="block text-sm font-medium text-gray-700 mb-2">Center Longitude</label>
							<input
								type="number"
								step="0.000001"
								value={mapConfig.defaultCenter.lng}
								on:input={(e) => updateCoordinates('lng', e.target.value)}
								class="w-full px-3 py-2 border border-gray-300 rounded-md"
							/>
						</div>
					</div>
					
					<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
						<div>
							<label class="block text-sm font-medium text-gray-700 mb-2">Default Zoom</label>
							<input
								type="number"
								min="1"
								max="20"
								bind:value={mapConfig.defaultZoom}
								class="w-full px-3 py-2 border border-gray-300 rounded-md"
							/>
						</div>
						
						<div>
							<label class="block text-sm font-medium text-gray-700 mb-2">Minimum Zoom</label>
							<input
								type="number"
								min="1"
								max="20"
								bind:value={mapConfig.minZoom}
								class="w-full px-3 py-2 border border-gray-300 rounded-md"
							/>
						</div>
						
						<div>
							<label class="block text-sm font-medium text-gray-700 mb-2">Maximum Zoom</label>
							<input
								type="number"
								min="1"
								max="20"
								bind:value={mapConfig.maxZoom}
								class="w-full px-3 py-2 border border-gray-300 rounded-md"
							/>
						</div>
					</div>
				</div>
			</div>
			
			<!-- Display Preferences -->
			<div class="bg-white rounded-lg shadow">
				<div class="px-6 py-4 border-b border-gray-200">
					<div class="flex items-center space-x-2">
						<Layers class="w-5 h-5 text-purple-500" />
						<h2 class="text-lg font-medium text-gray-900">Display Preferences</h2>
					</div>
					<p class="text-sm text-gray-500 mt-1">Configure map controls and overlays</p>
				</div>
				
				<div class="px-6 py-4">
					<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
						<div class="space-y-4">
							<h3 class="text-sm font-medium text-gray-900">Map Controls</h3>
							
							{#each [
								{ key: 'showScale', label: 'Show scale bar' },
								{ key: 'showCoordinates', label: 'Show mouse coordinates' },
								{ key: 'showMinimap', label: 'Show overview minimap' },
								{ key: 'showFullscreenControl', label: 'Show fullscreen button' },
								{ key: 'showLocationControl', label: 'Show location button' }
							] as control}
								<label class="flex items-center space-x-2">
									<input
										type="checkbox"
										bind:checked={mapConfig[control.key]}
										class="rounded border-gray-300"
									/>
									<span class="text-sm text-gray-700">{control.label}</span>
								</label>
							{/each}
						</div>
						
						<div class="space-y-4">
							<h3 class="text-sm font-medium text-gray-900">Base Layer</h3>
							
							<div>
								<label class="block text-sm font-medium text-gray-700 mb-2">Default Base Layer</label>
								<select bind:value={mapConfig.defaultBaseLayer} class="w-full px-3 py-2 border border-gray-300 rounded-md">
									<option value="osm">OpenStreetMap</option>
									<option value="satellite">Satellite Imagery</option>
									<option value="topographic">Topographic</option>
								</select>
							</div>
						</div>
					</div>
				</div>
			</div>
			
			<!-- Drawing Defaults -->
			<div class="bg-white rounded-lg shadow">
				<div class="px-6 py-4 border-b border-gray-200">
					<div class="flex items-center space-x-2">
						<Palette class="w-5 h-5 text-purple-500" />
						<h2 class="text-lg font-medium text-gray-900">Drawing Defaults</h2>
					</div>
					<p class="text-sm text-gray-500 mt-1">Set default styles for new annotations</p>
				</div>
				
				<div class="px-6 py-4 space-y-4">
					<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
						<div>
							<label class="block text-sm font-medium text-gray-700 mb-2">Default Color</label>
							<input
								type="color"
								bind:value={mapConfig.defaultAnnotationColor}
								class="w-full h-10 border border-gray-300 rounded-md"
							/>
						</div>
						
						<div>
							<label class="block text-sm font-medium text-gray-700 mb-2">Stroke Width</label>
							<input
								type="number"
								min="1"
								max="10"
								bind:value={mapConfig.defaultStrokeWidth}
								class="w-full px-3 py-2 border border-gray-300 rounded-md"
							/>
						</div>
						
						<div>
							<label class="block text-sm font-medium text-gray-700 mb-2">Fill Opacity</label>
							<input
								type="number"
								min="0"
								max="1"
								step="0.1"
								bind:value={mapConfig.defaultFillOpacity}
								class="w-full px-3 py-2 border border-gray-300 rounded-md"
							/>
						</div>
					</div>
					
					<div class="flex items-center space-x-4">
						<label class="flex items-center space-x-2">
							<input
								type="checkbox"
								bind:checked={mapConfig.snapToGrid}
								class="rounded border-gray-300"
							/>
							<span class="text-sm text-gray-700">Snap to grid</span>
						</label>
						
						{#if mapConfig.snapToGrid}
							<div class="flex items-center space-x-2">
								<span class="text-sm text-gray-700">Grid size:</span>
								<input
									type="number"
									min="1"
									max="100"
									bind:value={mapConfig.gridSize}
									class="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
								/>
								<span class="text-sm text-gray-500">meters</span>
							</div>
						{/if}
					</div>
				</div>
			</div>
			
			<!-- Units and Formats -->
			<div class="bg-white rounded-lg shadow">
				<div class="px-6 py-4 border-b border-gray-200">
					<div class="flex items-center space-x-2">
						<Navigation class="w-5 h-5 text-purple-500" />
						<h2 class="text-lg font-medium text-gray-900">Units and Formats</h2>
					</div>
					<p class="text-sm text-gray-500 mt-1">Configure measurement units and coordinate display</p>
				</div>
				
				<div class="px-6 py-4 space-y-4">
					<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
						<div>
							<label class="block text-sm font-medium text-gray-700 mb-2">Distance Units</label>
							<select bind:value={mapConfig.distanceUnit} class="w-full px-3 py-2 border border-gray-300 rounded-md">
								{#each units as unit}
									<option value={unit.value}>{unit.label}</option>
								{/each}
							</select>
						</div>
						
						<div>
							<label class="block text-sm font-medium text-gray-700 mb-2">Area Units</label>
							<select bind:value={mapConfig.areaUnit} class="w-full px-3 py-2 border border-gray-300 rounded-md">
								{#each units as unit}
									<option value={unit.value}>{unit.label}</option>
								{/each}
							</select>
						</div>
						
						<div>
							<label class="block text-sm font-medium text-gray-700 mb-2">Coordinate Format</label>
							<select bind:value={mapConfig.coordinateFormat} class="w-full px-3 py-2 border border-gray-300 rounded-md">
								{#each coordinateFormats as format}
									<option value={format.value}>{format.label}</option>
								{/each}
							</select>
						</div>
					</div>
				</div>
			</div>
			
			<!-- Performance Settings -->
			<div class="bg-white rounded-lg shadow">
				<div class="px-6 py-4 border-b border-gray-200">
					<div class="flex items-center space-x-2">
						<Grid class="w-5 h-5 text-purple-500" />
						<h2 class="text-lg font-medium text-gray-900">Performance Settings</h2>
					</div>
					<p class="text-sm text-gray-500 mt-1">Optimize map performance for your device</p>
				</div>
				
				<div class="px-6 py-4 space-y-4">
					<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
						<div class="space-y-4">
							<h3 class="text-sm font-medium text-gray-900">Photo Clustering</h3>
							
							<label class="flex items-center space-x-2">
								<input
									type="checkbox"
									bind:checked={mapConfig.clusterPhotos}
									class="rounded border-gray-300"
								/>
								<span class="text-sm text-gray-700">Enable photo clustering</span>
							</label>
							
							{#if mapConfig.clusterPhotos}
								<div class="ml-6 space-y-2">
									<div>
										<label class="block text-xs text-gray-500 mb-1">Cluster radius (meters)</label>
										<input
											type="number"
											min="10"
											max="200"
											bind:value={mapConfig.clusterRadius}
											class="w-full px-2 py-1 border border-gray-300 rounded text-sm"
										/>
									</div>
									
									<div>
										<label class="block text-xs text-gray-500 mb-1">Max cluster size</label>
										<input
											type="number"
											min="2"
											max="50"
											bind:value={mapConfig.maxClusterSize}
											class="w-full px-2 py-1 border border-gray-300 rounded text-sm"
										/>
									</div>
								</div>
							{/if}
						</div>
						
						<div class="space-y-4">
							<h3 class="text-sm font-medium text-gray-900">Geometry Processing</h3>
							
							<label class="flex items-center space-x-2">
								<input
									type="checkbox"
									bind:checked={mapConfig.simplifyGeometry}
									class="rounded border-gray-300"
								/>
								<span class="text-sm text-gray-700">Simplify complex geometries</span>
							</label>
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
</div>