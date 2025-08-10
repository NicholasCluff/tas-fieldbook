<script lang="ts">
	import { page } from '$app/stores'
	import { onMount } from 'svelte'
	import { 
		ArrowLeft, 
		Save, 
		MapPin, 
		Calendar, 
		Camera,
		Loader2,
		AlertCircle,
		X,
		Check,
		Map
	} from 'lucide-svelte'
	
	const projectId = $derived($page.params.id)
	const photoId = $derived($page.params.photoId)
	
	let photo: any = null
	let loading = true
	let saving = false
	let error: string | null = null
	let saveError: string | null = null
	
	// Form fields
	let title = ''
	let description = ''
	let locationLat: number | null = null
	let locationLng: number | null = null
	let takenAt = ''
	
	// Location picker
	let showLocationPicker = false
	let locationLoading = false
	let locationError: string | null = null
	
	onMount(() => {
		loadPhoto()
	})
	
	async function loadPhoto() {
		try {
			// TODO: Replace with actual photos service
			await new Promise(resolve => setTimeout(resolve, 500))
			
			// Mock photo data - replace with actual service call
			photo = {
				id: photoId,
				title: 'Survey Point Reference',
				description: 'Primary reference point for boundary survey',
				file_path: '/photos/survey-point-1.jpg',
				location_lat: -41.4545,
				location_lng: 145.9707,
				taken_at: '2024-01-15T09:30:00Z',
				created_at: '2024-01-15T09:35:00Z',
				user_id: 'user1',
				file_size: 2048000,
				mime_type: 'image/jpeg',
				metadata: {
					camera: 'iPhone 15 Pro',
					exposure: '1/120s',
					iso: '100',
					aperture: 'f/2.8',
					focalLength: '24mm'
				}
			}
			
			// Populate form fields
			title = photo.title || ''
			description = photo.description || ''
			locationLat = photo.location_lat
			locationLng = photo.location_lng
			takenAt = photo.taken_at ? new Date(photo.taken_at).toISOString().slice(0, 16) : ''
		} catch (err) {
			error = 'Failed to load photo'
		} finally {
			loading = false
		}
	}
	
	async function savePhoto() {
		saving = true
		saveError = null
		
		try {
			// TODO: Implement actual save logic
			const updates = {
				title: title.trim() || null,
				description: description.trim() || null,
				location_lat: locationLat,
				location_lng: locationLng,
				taken_at: takenAt ? new Date(takenAt).toISOString() : null
			}
			
			await new Promise(resolve => setTimeout(resolve, 1000)) // Mock delay
			
			// Success - redirect to photo view
			window.location.href = `/projects/${projectId}/photos/${photoId}`
		} catch (err) {
			saveError = 'Failed to save changes. Please try again.'
		} finally {
			saving = false
		}
	}
	
	async function getCurrentLocation() {
		if (!navigator.geolocation) {
			locationError = 'Geolocation not supported'
			return
		}
		
		locationLoading = true
		locationError = null
		
		try {
			const position = await new Promise<GeolocationPosition>((resolve, reject) => {
				navigator.geolocation.getCurrentPosition(resolve, reject, {
					enableHighAccuracy: true,
					timeout: 10000,
					maximumAge: 300000
				})
			})
			
			locationLat = position.coords.latitude
			locationLng = position.coords.longitude
		} catch (err) {
			locationError = 'Failed to get current location'
		} finally {
			locationLoading = false
		}
	}
	
	function clearLocation() {
		locationLat = null
		locationLng = null
	}
	
	function formatCoordinates(lat: number, lng: number): string {
		return `${lat.toFixed(6)}, ${lng.toFixed(6)}`
	}
	
	function formatDate(dateString: string): string {
		return new Date(dateString).toLocaleDateString('en-AU', {
			year: 'numeric',
			month: 'long',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		})
	}
	
	function formatFileSize(bytes: number): string {
		if (bytes === 0) return '0 Bytes'
		const k = 1024
		const sizes = ['Bytes', 'KB', 'MB', 'GB']
		const i = Math.floor(Math.log(bytes) / Math.log(k))
		return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
	}
	
	const hasChanges = $derived(
		title !== (photo?.title || '') ||
		description !== (photo?.description || '') ||
		locationLat !== photo?.location_lat ||
		locationLng !== photo?.location_lng ||
		takenAt !== (photo?.taken_at ? new Date(photo.taken_at).toISOString().slice(0, 16) : '')
	)
</script>

<div class="flex flex-col h-full">
	<!-- Header -->
	<div class="bg-white border-b border-gray-200 p-4">
		<div class="flex items-center justify-between">
			<div class="flex items-center space-x-3">
				<a 
					href="/projects/{projectId}/photos/{photoId}"
					class="p-2 hover:bg-gray-100 rounded-lg transition-colors"
				>
					<ArrowLeft class="w-5 h-5" />
				</a>
				<h1 class="text-lg font-semibold text-gray-900">Edit Photo</h1>
			</div>
			
			<div class="flex items-center space-x-3">
				{#if hasChanges}
					<span class="text-sm text-amber-600">Unsaved changes</span>
				{/if}
				
				<button 
					on:click={savePhoto}
					disabled={saving || !hasChanges}
					class="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg font-medium flex items-center space-x-2"
				>
					{#if saving}
						<Loader2 class="w-4 h-4 animate-spin" />
						<span>Saving...</span>
					{:else}
						<Save class="w-4 h-4" />
						<span>Save Changes</span>
					{/if}
				</button>
			</div>
		</div>
	</div>
	
	<!-- Content -->
	<div class="flex-1 overflow-y-auto">
		{#if loading}
			<div class="flex items-center justify-center h-full">
				<div class="text-center">
					<Loader2 class="w-12 h-12 animate-spin text-purple-600 mx-auto mb-4" />
					<p class="text-gray-500">Loading photo...</p>
				</div>
			</div>
		{:else if error}
			<div class="flex items-center justify-center h-full">
				<div class="text-center">
					<AlertCircle class="w-16 h-16 text-red-400 mx-auto mb-4" />
					<h3 class="text-lg font-medium text-gray-900 mb-2">Error Loading Photo</h3>
					<p class="text-gray-500 mb-6">{error}</p>
					<button 
						on:click={loadPhoto}
						class="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-medium"
					>
						Try Again
					</button>
				</div>
			</div>
		{:else if photo}
			<div class="max-w-4xl mx-auto p-6">
				<div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
					<!-- Photo Preview -->
					<div class="lg:col-span-1">
						<div class="sticky top-6">
							<div class="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
								<!-- Photo Display -->
								<div class="aspect-square bg-gray-100 flex items-center justify-center">
									<div class="text-center">
										<Camera class="w-16 h-16 text-gray-400 mx-auto mb-2" />
										<p class="text-sm text-gray-500">Photo Preview</p>
									</div>
								</div>
								
								<!-- Photo Info -->
								<div class="p-4 space-y-2">
									<div class="flex items-center space-x-2 text-sm text-gray-600">
										<span class="font-medium">File:</span>
										<span>{photo.file_path.split('/').pop()}</span>
									</div>
									
									<div class="flex items-center space-x-2 text-sm text-gray-600">
										<span class="font-medium">Size:</span>
										<span>{formatFileSize(photo.file_size)}</span>
									</div>
									
									<div class="flex items-center space-x-2 text-sm text-gray-600">
										<span class="font-medium">Type:</span>
										<span>{photo.mime_type}</span>
									</div>
									
									{#if photo.metadata?.camera}
										<div class="flex items-center space-x-2 text-sm text-gray-600">
											<span class="font-medium">Camera:</span>
											<span>{photo.metadata.camera}</span>
										</div>
									{/if}
								</div>
							</div>
						</div>
					</div>
					
					<!-- Edit Form -->
					<div class="lg:col-span-2">
						<div class="space-y-6">
							<!-- Error Message -->
							{#if saveError}
								<div class="bg-red-50 border border-red-200 rounded-lg p-4">
									<div class="flex items-center space-x-2">
										<AlertCircle class="w-5 h-5 text-red-400" />
										<span class="text-red-700">{saveError}</span>
									</div>
								</div>
							{/if}
							
							<!-- Basic Information -->
							<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
								<h3 class="text-lg font-semibold text-gray-900 mb-4">Photo Information</h3>
								
								<div class="space-y-4">
									<!-- Title -->
									<div>
										<label class="block text-sm font-medium text-gray-700 mb-2">
											Title
										</label>
										<input 
											bind:value={title}
											type="text" 
											placeholder="Enter photo title..."
											class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
										/>
									</div>
									
									<!-- Description -->
									<div>
										<label class="block text-sm font-medium text-gray-700 mb-2">
											Description
										</label>
										<textarea 
											bind:value={description}
											placeholder="Add a detailed description of this photo..."
											rows="4"
											class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 resize-none"
										></textarea>
									</div>
									
									<!-- Date Taken -->
									<div>
										<label class="block text-sm font-medium text-gray-700 mb-2">
											Date & Time Taken
										</label>
										<input 
											bind:value={takenAt}
											type="datetime-local"
											class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
										/>
									</div>
								</div>
							</div>
							
							<!-- Location Information -->
							<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
								<h3 class="text-lg font-semibold text-gray-900 mb-4">Location</h3>
								
								<div class="space-y-4">
									<!-- Current Location Display -->
									{#if locationLat && locationLng}
										<div class="bg-green-50 border border-green-200 rounded-lg p-4">
											<div class="flex items-center justify-between">
												<div>
													<div class="flex items-center space-x-2 text-green-700 font-medium">
														<MapPin class="w-5 h-5" />
														<span>Location Set</span>
													</div>
													<div class="text-sm text-green-600 mt-1 font-mono">
														{formatCoordinates(locationLat, locationLng)}
													</div>
												</div>
												<button 
													on:click={clearLocation}
													class="text-green-600 hover:text-green-700 p-1"
													title="Clear location"
												>
													<X class="w-5 h-5" />
												</button>
											</div>
										</div>
									{:else}
										<div class="bg-gray-50 border border-gray-200 rounded-lg p-4">
											<div class="flex items-center space-x-2 text-gray-600">
												<MapPin class="w-5 h-5" />
												<span>No location set</span>
											</div>
										</div>
									{/if}
									
									<!-- Location Actions -->
									<div class="flex items-center space-x-3">
										<button 
											on:click={getCurrentLocation}
											disabled={locationLoading}
											class="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg font-medium flex items-center space-x-2"
										>
											{#if locationLoading}
												<Loader2 class="w-4 h-4 animate-spin" />
												<span>Getting Location...</span>
											{:else}
												<MapPin class="w-4 h-4" />
												<span>Use Current Location</span>
											{/if}
										</button>
										
										<button 
											on:click={() => showLocationPicker = true}
											class="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg font-medium flex items-center space-x-2"
										>
											<Map class="w-4 h-4" />
											<span>Pick on Map</span>
										</button>
									</div>
									
									<!-- Location Error -->
									{#if locationError}
										<div class="text-red-600 text-sm">{locationError}</div>
									{/if}
									
									<!-- Manual Coordinates -->
									<div class="border-t border-gray-200 pt-4">
										<h4 class="text-sm font-medium text-gray-700 mb-3">Manual Coordinates</h4>
										<div class="grid grid-cols-2 gap-3">
											<div>
												<label class="block text-sm text-gray-600 mb-1">Latitude</label>
												<input 
													bind:value={locationLat}
													type="number" 
													step="0.000001"
													placeholder="-41.4545"
													class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
												/>
											</div>
											<div>
												<label class="block text-sm text-gray-600 mb-1">Longitude</label>
												<input 
													bind:value={locationLng}
													type="number" 
													step="0.000001"
													placeholder="145.9707"
													class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
												/>
											</div>
										</div>
									</div>
								</div>
							</div>
							
							<!-- EXIF Metadata (Read-only) -->
							{#if photo.metadata}
								<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
									<h3 class="text-lg font-semibold text-gray-900 mb-4">Camera Information</h3>
									
									<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
										{#if photo.metadata.camera}
											<div class="flex justify-between">
												<span class="text-gray-600">Camera:</span>
												<span class="font-medium">{photo.metadata.camera}</span>
											</div>
										{/if}
										
										{#if photo.metadata.exposure}
											<div class="flex justify-between">
												<span class="text-gray-600">Exposure:</span>
												<span class="font-medium">{photo.metadata.exposure}</span>
											</div>
										{/if}
										
										{#if photo.metadata.iso}
											<div class="flex justify-between">
												<span class="text-gray-600">ISO:</span>
												<span class="font-medium">{photo.metadata.iso}</span>
											</div>
										{/if}
										
										{#if photo.metadata.aperture}
											<div class="flex justify-between">
												<span class="text-gray-600">Aperture:</span>
												<span class="font-medium">{photo.metadata.aperture}</span>
											</div>
										{/if}
										
										{#if photo.metadata.focalLength}
											<div class="flex justify-between">
												<span class="text-gray-600">Focal Length:</span>
												<span class="font-medium">{photo.metadata.focalLength}</span>
											</div>
										{/if}
									</div>
								</div>
							{/if}
							
							<!-- Action Buttons -->
							<div class="flex items-center justify-between pt-6">
								<a 
									href="/projects/{projectId}/photos/{photoId}"
									class="text-gray-600 hover:text-gray-800 font-medium"
								>
									Cancel
								</a>
								
								<button 
									on:click={savePhoto}
									disabled={saving || !hasChanges}
									class="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-2 rounded-lg font-medium flex items-center space-x-2"
								>
									{#if saving}
										<Loader2 class="w-4 h-4 animate-spin" />
										<span>Saving...</span>
									{:else}
										<Check class="w-4 h-4" />
										<span>Save Changes</span>
									{/if}
								</button>
							</div>
						</div>
					</div>
				</div>
			</div>
		{/if}
	</div>
</div>

<!-- Location Picker Modal -->
{#if showLocationPicker}
	<div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
		<div class="bg-white rounded-lg max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden">
			<div class="p-4 border-b border-gray-200">
				<div class="flex items-center justify-between">
					<h3 class="text-lg font-semibold text-gray-900">Pick Location on Map</h3>
					<button 
						on:click={() => showLocationPicker = false}
						class="p-1 hover:bg-gray-100 rounded"
					>
						<X class="w-5 h-5" />
					</button>
				</div>
			</div>
			
			<div class="p-6 text-center">
				<Map class="w-16 h-16 text-gray-400 mx-auto mb-4" />
				<p class="text-gray-600 mb-4">Map integration coming soon...</p>
				<p class="text-sm text-gray-500">For now, use current location or enter coordinates manually.</p>
			</div>
		</div>
	</div>
{/if}