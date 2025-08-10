<script lang="ts">
	import { onMount, onDestroy } from 'svelte'
	import { browser } from '$app/environment'
	
	export let projectId: string
	
	let mapElement: HTMLDivElement
	let map: any // Leaflet map instance
	let annotations: any[] = []
	let photos: any[] = []
	let wmsLayers: any[] = []
	
	// Map state
	let center = [-41.4545, 145.9707] // Tasmania center
	let zoom = 10
	let baseLayers: Record<string, any> = {}
	let overlayLayers: Record<string, any> = {}
	
	onMount(async () => {
		if (browser) {
			// Dynamic import of Leaflet to avoid SSR issues
			const L = await import('leaflet')
			
			// Initialize map
			map = L.map(mapElement, {
				center: center as [number, number],
				zoom: zoom,
				zoomControl: false
			})
			
			// Add zoom control to top-left
			L.control.zoom({ position: 'topleft' }).addTo(map)
			
			// Add base layers
			baseLayers['OpenStreetMap'] = L.tileLayer(
				'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
				{
					attribution: '© OpenStreetMap contributors',
					maxZoom: 19
				}
			)
			
			baseLayers['Satellite'] = L.tileLayer(
				'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
				{
					attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
					maxZoom: 18
				}
			)
			
			baseLayers['Topographic'] = L.tileLayer(
				'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
				{
					attribution: 'Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, <a href="http://viewfinderpanoramas.org">SRTM</a> | Map style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a> (<a href="https://creativecommons.org/licenses/by-sa/3.0/">CC-BY-SA</a>)',
					maxZoom: 17
				}
			)
			
			// Set default base layer
			baseLayers['OpenStreetMap'].addTo(map)
			
			// Add layer control
			const layerControl = L.control.layers(baseLayers, overlayLayers, {
				position: 'topright',
				collapsed: false
			}).addTo(map)
			
			// Add scale
			L.control.scale({ position: 'bottomleft' }).addTo(map)
			
			// Add location control
			if (navigator.geolocation) {
				const locationButton = L.control({position: 'topleft'})
				locationButton.onAdd = function(map) {
					const div = L.DomUtil.create('div', 'leaflet-bar leaflet-control leaflet-control-custom')
					div.innerHTML = '<button type="button" title="Show my location">📍</button>'
					div.style.backgroundColor = 'white'
					div.style.width = '30px'
					div.style.height = '30px'
					div.style.cursor = 'pointer'
					
					div.onclick = function() {
						navigator.geolocation.getCurrentPosition(function(position) {
							const lat = position.coords.latitude
							const lng = position.coords.longitude
							map.setView([lat, lng], 16)
							L.marker([lat, lng]).addTo(map)
								.bindPopup('Your current location')
								.openPopup()
						})
					}
					
					return div
				}
				locationButton.addTo(map)
			}
			
			// Load project-specific data
			loadMapData()
		}
	})
	
	onDestroy(() => {
		if (map) {
			map.remove()
		}
	})
	
	async function loadMapData() {
		// TODO: Load annotations, photos, and saved map configuration
		// Loading map data for project
	}
	
	// Public methods for parent components
	export function addWMSLayer(name: string, url: string, layers: string, options: any = {}) {
		if (!map) return
		
		const L = window.L
		const wmsLayer = L.tileLayer.wms(url, {
			layers: layers,
			format: 'image/png',
			transparent: true,
			...options
		})
		
		overlayLayers[name] = wmsLayer
		
		// Update layer control
		map.eachLayer((layer: any) => {
			if (layer.options && layer.options.layers === layers) {
				map.removeLayer(layer)
			}
		})
	}
	
	export function toggleLayer(layerName: string, visible: boolean) {
		if (!map || !overlayLayers[layerName]) return
		
		if (visible) {
			overlayLayers[layerName].addTo(map)
		} else {
			map.removeLayer(overlayLayers[layerName])
		}
	}
	
	export function setLayerOpacity(layerName: string, opacity: number) {
		if (!map || !overlayLayers[layerName]) return
		overlayLayers[layerName].setOpacity(opacity)
	}
	
	export function flyTo(lat: number, lng: number, zoom?: number) {
		if (!map) return
		map.flyTo([lat, lng], zoom || map.getZoom())
	}
	
	export function fitBounds(bounds: [[number, number], [number, number]]) {
		if (!map) return
		map.fitBounds(bounds)
	}
	
	export function getMap() {
		return map
	}
</script>

<div bind:this={mapElement} class="w-full h-full"></div>

<style>
	:global(.leaflet-control-custom button) {
		border: none;
		background: none;
		font-size: 14px;
		line-height: 28px;
		width: 28px;
		height: 28px;
		display: flex;
		align-items: center;
		justify-content: center;
	}
</style>