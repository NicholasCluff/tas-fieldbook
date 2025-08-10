<script lang="ts">
	import { onMount } from 'svelte'
	import { 
		Camera,
		MapPin,
		Calendar,
		User,
		ExternalLink,
		X,
		ChevronLeft,
		ChevronRight,
		Download,
		Move
	} from 'lucide-svelte'
	
	export let projectId: string
	export let mapContainer: any
	
	type Photo = {
		id: string
		title: string | null
		description: string | null
		file_path: string
		location_lat: number | null
		location_lng: number | null
		taken_at: string | null
		created_at: string
		user_id: string
		metadata?: {
			camera?: string
			exposure?: string
			iso?: string
			direction?: number
		}
	}
	
	let photos: Photo[] = []
	let clusteredPhotos: Array<{lat: number, lng: number, photos: Photo[]}> = []
	let selectedPhoto: Photo | null = null
	let selectedCluster: Photo[] | null = null
	let showPhotoViewer = false
	let photoViewerIndex = 0
	let draggedPhoto: Photo | null = null
	let mapBounds: any = null
	
	// Filter options
	let showOnlyWithLocation = false
	let showOnlyWithoutLocation = false
	let dateFilter = ''
	let userFilter = ''
	
	onMount(() => {
		loadPhotos()
		
		// Listen for map bounds changes to update visible photos
		if (mapContainer) {
			// TODO: Add map event listeners for bounds changes
		}
	})
	
	async function loadPhotos() {
		try {
			// TODO: Load from Supabase
			// Mock data for development
			photos = [
				{
					id: '1',
					title: 'Survey Point Reference',
					description: 'Primary reference point for boundary survey',
					file_path: '/photos/survey-point-1.jpg',
					location_lat: -41.4545,
					location_lng: 145.9707,
					taken_at: '2024-01-15T09:30:00Z',
					created_at: '2024-01-15T09:35:00Z',
					user_id: 'user1',
					metadata: {
						camera: 'iPhone 15 Pro',
						exposure: '1/120s',
						iso: '100',
						direction: 45
					}
				},
				{
					id: '2',
					title: 'Corner Peg Detail',
					description: 'Detail shot of corner survey peg',
					file_path: '/photos/corner-peg-1.jpg',
					location_lat: -41.4550,
					location_lng: 145.9710,
					taken_at: '2024-01-15T10:15:00Z',
					created_at: '2024-01-15T10:20:00Z',
					user_id: 'user1'
				},
				{
					id: '3',
					title: 'Equipment Setup',
					description: null,
					file_path: '/photos/equipment-setup.jpg',
					location_lat: null,
					location_lng: null,
					taken_at: '2024-01-15T08:45:00Z',
					created_at: '2024-01-15T11:00:00Z',
					user_id: 'user1'
				}
			]
			
			updatePhotoCluster()
		} catch (error) {
			// Failed to load photos
		}
	}
	
	function updatePhotoCluster() {
		// Simple clustering algorithm - group photos within 50m radius
		const clusters: Array<{lat: number, lng: number, photos: Photo[]}> = []
		const processed = new Set<string>()
		
		photos
			.filter(photo => photo.location_lat && photo.location_lng)
			.forEach(photo => {
				if (processed.has(photo.id)) return
				
				const cluster = {
					lat: photo.location_lat!,
					lng: photo.location_lng!,
					photos: [photo]
				}
				
				// Find nearby photos
				photos.forEach(otherPhoto => {
					if (
						otherPhoto.id !== photo.id &&
						!processed.has(otherPhoto.id) &&
						otherPhoto.location_lat &&
						otherPhoto.location_lng
					) {
						const distance = calculateDistance(
							photo.location_lat!,
							photo.location_lng!,
							otherPhoto.location_lat,
							otherPhoto.location_lng
						)
						
						if (distance < 50) { // 50 meter clustering radius
							cluster.photos.push(otherPhoto)
							processed.add(otherPhoto.id)
						}
					}
				})
				
				processed.add(photo.id)
				clusters.push(cluster)
			})
		
		clusteredPhotos = clusters
	}
	
	function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
		const R = 6371000 // Earth's radius in meters
		const φ1 = lat1 * Math.PI / 180
		const φ2 = lat2 * Math.PI / 180
		const Δφ = (lat2 - lat1) * Math.PI / 180
		const Δλ = (lng2 - lng1) * Math.PI / 180
		
		const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
			Math.cos(φ1) * Math.cos(φ2) *
			Math.sin(Δλ/2) * Math.sin(Δλ/2)
		const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
		
		return R * c
	}
	
	function selectPhoto(photo: Photo) {
		selectedPhoto = photo
		
		// Focus map on photo location if available
		if (photo.location_lat && photo.location_lng && mapContainer) {
			mapContainer.flyTo(photo.location_lat, photo.location_lng, 16)
		}
	}
	
	function selectCluster(photos: Photo[]) {
		selectedCluster = photos
		if (photos.length === 1) {
			selectPhoto(photos[0])
		}
	}
	
	function openPhotoViewer(photo: Photo, photoList?: Photo[]) {
		const photos = photoList || (selectedCluster || [photo])
		photoViewerIndex = photos.findIndex(p => p.id === photo.id)
		selectedCluster = photos
		showPhotoViewer = true
	}
	
	function closePhotoViewer() {
		showPhotoViewer = false
		selectedCluster = null
		photoViewerIndex = 0
	}
	
	function nextPhoto() {
		if (!selectedCluster) return
		photoViewerIndex = (photoViewerIndex + 1) % selectedCluster.length
	}
	
	function prevPhoto() {
		if (!selectedCluster) return
		photoViewerIndex = photoViewerIndex === 0 ? selectedCluster.length - 1 : photoViewerIndex - 1
	}
	
	function startDragPhoto(photo: Photo) {
		draggedPhoto = photo
	}
	
	function handleMapClick(event: any) {
		if (!draggedPhoto) return
		
		// TODO: Update photo location from map click
		const lat = event.latlng.lat
		const lng = event.latlng.lng
		
		updatePhotoLocation(draggedPhoto.id, lat, lng)
		draggedPhoto = null
	}
	
	async function updatePhotoLocation(photoId: string, lat: number, lng: number) {
		try {
			// TODO: Update in Supabase
			// Update local state
			photos = photos.map(photo => 
				photo.id === photoId 
					? { ...photo, location_lat: lat, location_lng: lng }
					: photo
			)
			
			updatePhotoCluster()
		} catch (error) {
			// Failed to update photo location
		}
	}
	
	function downloadPhoto(photo: Photo) {
		// TODO: Implement photo download from Supabase storage
		// Photo download would be handled here
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
	
	// Filtered photos for the list
	$: filteredPhotos = photos.filter(photo => {
		if (showOnlyWithLocation && (!photo.location_lat || !photo.location_lng)) return false
		if (showOnlyWithoutLocation && (photo.location_lat && photo.location_lng)) return false
		if (dateFilter && !photo.taken_at?.includes(dateFilter)) return false
		if (userFilter && photo.user_id !== userFilter) return false
		return true
	})
	
	// Get unique users for filter
	$: users = [...new Set(photos.map(p => p.user_id))]
</script>

<div class="h-full flex flex-col">
	<!-- Filters -->
	<div class="p-4 border-b border-gray-200">
		<h3 class="text-sm font-medium text-gray-900 mb-3">Photo Filters</h3>
		
		<div class="space-y-3">
			<div class="flex space-x-2">
				<label class="flex items-center space-x-2 text-xs">
					<input
						type="checkbox"
						bind:checked={showOnlyWithLocation}
						on:change={() => showOnlyWithoutLocation = false}
						class="rounded border-gray-300"
					/>
					<span>With location</span>
				</label>
				
				<label class="flex items-center space-x-2 text-xs">
					<input
						type="checkbox"
						bind:checked={showOnlyWithoutLocation}
						on:change={() => showOnlyWithLocation = false}
						class="rounded border-gray-300"
					/>
					<span>Without location</span>
				</label>
			</div>
			
			<div class="flex space-x-2">
				<input
					bind:value={dateFilter}
					type="date"
					class="flex-1 px-2 py-1 border border-gray-300 rounded text-xs"
					placeholder="Filter by date"
				/>
				
				<select
					bind:value={userFilter}
					class="flex-1 px-2 py-1 border border-gray-300 rounded text-xs"
				>
					<option value="">All users</option>
					{#each users as user}
						<option value={user}>{user}</option>
					{/each}
				</select>
			</div>
		</div>
	</div>
	
	<!-- Photo List -->
	<div class="flex-1 overflow-y-auto">
		<div class="p-4">
			<div class="flex items-center justify-between mb-3">
				<h4 class="text-sm font-medium text-gray-900">Photos</h4>
				<span class="text-xs text-gray-500">{filteredPhotos.length} of {photos.length}</span>
			</div>
			
			{#if filteredPhotos.length === 0}
				<p class="text-sm text-gray-500 text-center py-8">
					No photos match the current filters.
				</p>
			{:else}
				<div class="space-y-3">
					{#each filteredPhotos as photo}
						<div 
							class="border border-gray-200 rounded-lg overflow-hidden cursor-pointer transition-colors {selectedPhoto?.id === photo.id ? 'border-purple-500 bg-purple-50' : 'hover:bg-gray-50'}"
							on:click={() => selectPhoto(photo)}
						>
							<!-- Photo thumbnail placeholder -->
							<div class="aspect-video bg-gray-100 flex items-center justify-center">
								<Camera class="w-8 h-8 text-gray-400" />
							</div>
							
							<div class="p-3">
								<div class="flex items-start justify-between mb-2">
									<h5 class="text-sm font-medium text-gray-900 truncate">
										{photo.title || 'Untitled Photo'}
									</h5>
									
									<div class="flex items-center space-x-1 ml-2">
										{#if photo.location_lat && photo.location_lng}
											<MapPin class="w-3 h-3 text-green-500" title="Has location" />
										{:else}
											<button
												on:click|stopPropagation={() => startDragPhoto(photo)}
												class="p-1 text-gray-400 hover:text-purple-600 rounded"
												title="Set location"
											>
												<Move class="w-3 h-3" />
											</button>
										{/if}
										
										<button
											on:click|stopPropagation={() => openPhotoViewer(photo)}
											class="p-1 text-gray-400 hover:text-gray-600 rounded"
											title="View full size"
										>
											<ExternalLink class="w-3 h-3" />
										</button>
									</div>
								</div>
								
								{#if photo.description}
									<p class="text-xs text-gray-500 mb-2 line-clamp-2">{photo.description}</p>
								{/if}
								
								<div class="flex items-center justify-between text-xs text-gray-500">
									<div class="flex items-center space-x-2">
										<Calendar class="w-3 h-3" />
										<span>{photo.taken_at ? formatDate(photo.taken_at) : 'No date'}</span>
									</div>
									
									<div class="flex items-center space-x-1">
										<User class="w-3 h-3" />
										<span>{photo.user_id}</span>
									</div>
								</div>
								
								{#if photo.metadata}
									<div class="mt-2 text-xs text-gray-400">
										{#if photo.metadata.camera}
											<div>{photo.metadata.camera}</div>
										{/if}
										{#if photo.metadata.exposure || photo.metadata.iso}
											<div>
												{#if photo.metadata.exposure}{photo.metadata.exposure}{/if}
												{#if photo.metadata.iso} • ISO {photo.metadata.iso}{/if}
											</div>
										{/if}
									</div>
								{/if}
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</div>
	</div>
</div>

<!-- Photo Viewer Modal -->
{#if showPhotoViewer && selectedCluster}
	<div class="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
		<div class="max-w-4xl max-h-screen w-full h-full flex flex-col bg-white">
			<!-- Header -->
			<div class="flex items-center justify-between p-4 border-b border-gray-200">
				<div class="flex items-center space-x-4">
					<h3 class="text-lg font-medium text-gray-900">
						{selectedCluster[photoViewerIndex].title || 'Untitled Photo'}
					</h3>
					<span class="text-sm text-gray-500">
						{photoViewerIndex + 1} of {selectedCluster.length}
					</span>
				</div>
				
				<div class="flex items-center space-x-2">
					<button
						on:click={() => downloadPhoto(selectedCluster[photoViewerIndex])}
						class="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-md"
					>
						<Download class="w-5 h-5" />
					</button>
					
					<button
						on:click={closePhotoViewer}
						class="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-md"
					>
						<X class="w-5 h-5" />
					</button>
				</div>
			</div>
			
			<!-- Photo Display -->
			<div class="flex-1 flex items-center justify-center bg-gray-100 relative">
				<!-- Navigation Buttons -->
				{#if selectedCluster.length > 1}
					<button
						on:click={prevPhoto}
						class="absolute left-4 top-1/2 transform -translate-y-1/2 p-2 bg-black bg-opacity-50 text-white rounded-full hover:bg-opacity-75 z-10"
					>
						<ChevronLeft class="w-6 h-6" />
					</button>
					
					<button
						on:click={nextPhoto}
						class="absolute right-4 top-1/2 transform -translate-y-1/2 p-2 bg-black bg-opacity-50 text-white rounded-full hover:bg-opacity-75 z-10"
					>
						<ChevronRight class="w-6 h-6" />
					</button>
				{/if}
				
				<!-- Photo placeholder -->
				<div class="w-full h-full flex items-center justify-center">
					<div class="text-center">
						<Camera class="w-24 h-24 text-gray-400 mx-auto mb-4" />
						<p class="text-gray-500">Photo: {selectedCluster[photoViewerIndex].file_path}</p>
					</div>
				</div>
			</div>
			
			<!-- Photo Info -->
			<div class="p-4 border-t border-gray-200 bg-gray-50">
				<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
					<div>
						<h4 class="text-sm font-medium text-gray-900 mb-2">Details</h4>
						<div class="space-y-1 text-sm text-gray-600">
							<div>Taken: {selectedCluster[photoViewerIndex].taken_at ? formatDate(selectedCluster[photoViewerIndex].taken_at) : 'Unknown'}</div>
							<div>By: {selectedCluster[photoViewerIndex].user_id}</div>
							{#if selectedCluster[photoViewerIndex].location_lat && selectedCluster[photoViewerIndex].location_lng}
								<div>Location: {selectedCluster[photoViewerIndex].location_lat?.toFixed(6)}, {selectedCluster[photoViewerIndex].location_lng?.toFixed(6)}</div>
							{/if}
						</div>
					</div>
					
					<div>
						<h4 class="text-sm font-medium text-gray-900 mb-2">Description</h4>
						<p class="text-sm text-gray-600">
							{selectedCluster[photoViewerIndex].description || 'No description'}
						</p>
					</div>
					
					{#if selectedCluster[photoViewerIndex].metadata}
						<div>
							<h4 class="text-sm font-medium text-gray-900 mb-2">Camera Info</h4>
							<div class="space-y-1 text-sm text-gray-600">
								{#if selectedCluster[photoViewerIndex].metadata?.camera}
									<div>Camera: {selectedCluster[photoViewerIndex].metadata.camera}</div>
								{/if}
								{#if selectedCluster[photoViewerIndex].metadata?.exposure}
									<div>Exposure: {selectedCluster[photoViewerIndex].metadata.exposure}</div>
								{/if}
								{#if selectedCluster[photoViewerIndex].metadata?.iso}
									<div>ISO: {selectedCluster[photoViewerIndex].metadata.iso}</div>
								{/if}
							</div>
						</div>
					{/if}
				</div>
			</div>
		</div>
	</div>
{/if}

<style>
	.line-clamp-2 {
		display: -webkit-box;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}
	
	.aspect-video {
		aspect-ratio: 16 / 9;
	}
</style>