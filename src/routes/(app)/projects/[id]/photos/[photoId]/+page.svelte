<script lang="ts">
	import { page } from '$app/stores'
	import { onMount } from 'svelte'
	import { 
		ArrowLeft, 
		Edit, 
		Trash2, 
		Download, 
		MapPin, 
		Calendar, 
		User, 
		Camera,
		FileImage,
		ExternalLink,
		Share
	} from 'lucide-svelte'
	
	const projectId = $derived($page.params.id)
	const photoId = $derived($page.params.photoId)
	
	let photo: any = null
	let loading = true
	let error: string | null = null
	
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
				description: 'Primary reference point for boundary survey. This marker was established during the initial site visit and serves as the baseline for all subsequent measurements.',
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
					focalLength: '24mm',
					direction: 45,
					altitude: 123.5
				}
			}
		} catch (err) {
			error = 'Failed to load photo'
		} finally {
			loading = false
		}
	}
	
	async function deletePhoto() {
		if (!confirm('Are you sure you want to delete this photo? This action cannot be undone.')) {
			return
		}
		
		try {
			// TODO: Implement actual delete logic
			await new Promise(resolve => setTimeout(resolve, 1000))
			
			// Redirect to photos page
			window.location.href = `/projects/${projectId}/photos`
		} catch (err) {
			alert('Failed to delete photo. Please try again.')
		}
	}
	
	async function downloadPhoto() {
		if (!photo) return
		
		try {
			// TODO: Implement actual download logic
			// Mock download
			const link = document.createElement('a')
			link.href = photo.file_path
			link.download = `${photo.title || 'photo'}.jpg`
			link.click()
		} catch (err) {
			alert('Failed to download photo. Please try again.')
		}
	}
	
	function formatDate(dateString: string): string {
		return new Date(dateString).toLocaleDateString('en-AU', {
			weekday: 'long',
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
	
	function formatCoordinates(lat: number, lng: number): string {
		return `${lat.toFixed(6)}, ${lng.toFixed(6)}`
	}
</script>

<div class="flex flex-col h-full">
	<!-- Header -->
	<div class="bg-white border-b border-gray-200 p-4">
		<div class="flex items-center justify-between">
			<div class="flex items-center space-x-3">
				<a 
					href="/projects/{projectId}/photos"
					class="p-2 hover:bg-gray-100 rounded-lg transition-colors"
				>
					<ArrowLeft class="w-5 h-5" />
				</a>
				<h1 class="text-lg font-semibold text-gray-900">Photo Details</h1>
			</div>
			
			{#if photo}
				<div class="flex items-center space-x-2">
					<button 
						on:click={downloadPhoto}
						class="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
						title="Download photo"
					>
						<Download class="w-5 h-5" />
					</button>
					
					<button 
						class="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
						title="Share photo"
					>
						<Share class="w-5 h-5" />
					</button>
					
					<a 
						href="/projects/{projectId}/photos/{photoId}/edit"
						class="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
						title="Edit photo"
					>
						<Edit class="w-5 h-5" />
					</a>
					
					<button 
						on:click={deletePhoto}
						class="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
						title="Delete photo"
					>
						<Trash2 class="w-5 h-5" />
					</button>
				</div>
			{/if}
		</div>
	</div>
	
	<!-- Content -->
	<div class="flex-1 overflow-y-auto">
		{#if loading}
			<div class="flex items-center justify-center h-full">
				<div class="text-center">
					<div class="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
					<p class="text-gray-500">Loading photo...</p>
				</div>
			</div>
		{:else if error}
			<div class="flex items-center justify-center h-full">
				<div class="text-center">
					<FileImage class="w-16 h-16 text-gray-400 mx-auto mb-4" />
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
			<div class="max-w-4xl mx-auto">
				<!-- Photo Display -->
				<div class="bg-black">
					<div class="aspect-video bg-gray-900 flex items-center justify-center">
						<div class="text-center text-white">
							<Camera class="w-24 h-24 mx-auto mb-4 text-gray-400" />
							<p class="text-gray-300">Photo: {photo.file_path}</p>
						</div>
					</div>
				</div>
				
				<!-- Photo Information -->
				<div class="bg-white">
					<div class="p-6">
						<!-- Title and Description -->
						<div class="mb-6">
							<h2 class="text-2xl font-bold text-gray-900 mb-2">
								{photo.title || 'Untitled Photo'}
							</h2>
							{#if photo.description}
								<p class="text-gray-600 leading-relaxed">{photo.description}</p>
							{/if}
						</div>
						
						<!-- Quick Stats -->
						<div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
							<div class="text-center p-3 bg-gray-50 rounded-lg">
								<Calendar class="w-6 h-6 text-gray-600 mx-auto mb-1" />
								<div class="text-sm text-gray-500">Taken</div>
								<div class="text-sm font-medium">
									{new Date(photo.taken_at).toLocaleDateString('en-AU')}
								</div>
							</div>
							
							<div class="text-center p-3 bg-gray-50 rounded-lg">
								<User class="w-6 h-6 text-gray-600 mx-auto mb-1" />
								<div class="text-sm text-gray-500">By</div>
								<div class="text-sm font-medium">{photo.user_id}</div>
							</div>
							
							<div class="text-center p-3 bg-gray-50 rounded-lg">
								<FileImage class="w-6 h-6 text-gray-600 mx-auto mb-1" />
								<div class="text-sm text-gray-500">Size</div>
								<div class="text-sm font-medium">{formatFileSize(photo.file_size)}</div>
							</div>
							
							<div class="text-center p-3 bg-gray-50 rounded-lg">
								{#if photo.location_lat && photo.location_lng}
									<MapPin class="w-6 h-6 text-green-600 mx-auto mb-1" />
									<div class="text-sm text-gray-500">Location</div>
									<div class="text-sm font-medium text-green-600">GPS</div>
								{:else}
									<MapPin class="w-6 h-6 text-gray-400 mx-auto mb-1" />
									<div class="text-sm text-gray-500">Location</div>
									<div class="text-sm font-medium text-gray-400">None</div>
								{/if}
							</div>
						</div>
					</div>
					
					<!-- Details Grid -->
					<div class="border-t border-gray-200 p-6">
						<div class="grid grid-cols-1 md:grid-cols-2 gap-8">
							<!-- Photo Details -->
							<div>
								<h3 class="text-lg font-semibold text-gray-900 mb-4">Photo Details</h3>
								<div class="space-y-3">
									<div class="flex justify-between">
										<span class="text-gray-600">File Name:</span>
										<span class="font-medium">{photo.file_path.split('/').pop()}</span>
									</div>
									
									<div class="flex justify-between">
										<span class="text-gray-600">File Type:</span>
										<span class="font-medium">{photo.mime_type}</span>
									</div>
									
									<div class="flex justify-between">
										<span class="text-gray-600">File Size:</span>
										<span class="font-medium">{formatFileSize(photo.file_size)}</span>
									</div>
									
									<div class="flex justify-between">
										<span class="text-gray-600">Taken:</span>
										<span class="font-medium">{formatDate(photo.taken_at)}</span>
									</div>
									
									<div class="flex justify-between">
										<span class="text-gray-600">Uploaded:</span>
										<span class="font-medium">{formatDate(photo.created_at)}</span>
									</div>
									
									<div class="flex justify-between">
										<span class="text-gray-600">Uploaded by:</span>
										<span class="font-medium">{photo.user_id}</span>
									</div>
								</div>
							</div>
							
							<!-- Camera & Location Info -->
							<div>
								<h3 class="text-lg font-semibold text-gray-900 mb-4">Camera & Location</h3>
								<div class="space-y-3">
									{#if photo.metadata?.camera}
										<div class="flex justify-between">
											<span class="text-gray-600">Camera:</span>
											<span class="font-medium">{photo.metadata.camera}</span>
										</div>
									{/if}
									
									{#if photo.metadata?.exposure}
										<div class="flex justify-between">
											<span class="text-gray-600">Exposure:</span>
											<span class="font-medium">{photo.metadata.exposure}</span>
										</div>
									{/if}
									
									{#if photo.metadata?.iso}
										<div class="flex justify-between">
											<span class="text-gray-600">ISO:</span>
											<span class="font-medium">{photo.metadata.iso}</span>
										</div>
									{/if}
									
									{#if photo.metadata?.aperture}
										<div class="flex justify-between">
											<span class="text-gray-600">Aperture:</span>
											<span class="font-medium">{photo.metadata.aperture}</span>
										</div>
									{/if}
									
									{#if photo.metadata?.focalLength}
										<div class="flex justify-between">
											<span class="text-gray-600">Focal Length:</span>
											<span class="font-medium">{photo.metadata.focalLength}</span>
										</div>
									{/if}
									
									{#if photo.location_lat && photo.location_lng}
										<div class="flex justify-between">
											<span class="text-gray-600">Coordinates:</span>
											<span class="font-medium font-mono text-sm">
												{formatCoordinates(photo.location_lat, photo.location_lng)}
											</span>
										</div>
									{/if}
									
									{#if photo.metadata?.altitude}
										<div class="flex justify-between">
											<span class="text-gray-600">Altitude:</span>
											<span class="font-medium">{photo.metadata.altitude}m</span>
										</div>
									{/if}
									
									{#if photo.metadata?.direction}
										<div class="flex justify-between">
											<span class="text-gray-600">Direction:</span>
											<span class="font-medium">{photo.metadata.direction}°</span>
										</div>
									{/if}
								</div>
							</div>
						</div>
					</div>
					
					<!-- Action Buttons -->
					<div class="border-t border-gray-200 p-6">
						<div class="flex items-center space-x-4">
							<a 
								href="/projects/{projectId}/photos/{photoId}/edit"
								class="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg font-medium inline-flex items-center space-x-2"
							>
								<Edit class="w-5 h-5" />
								<span>Edit Photo</span>
							</a>
							
							<button 
								on:click={downloadPhoto}
								class="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded-lg font-medium inline-flex items-center space-x-2"
							>
								<Download class="w-5 h-5" />
								<span>Download</span>
							</button>
							
							{#if photo.location_lat && photo.location_lng}
								<a 
									href="/projects/{projectId}/map?lat={photo.location_lat}&lng={photo.location_lng}"
									class="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-medium inline-flex items-center space-x-2"
								>
									<MapPin class="w-5 h-5" />
									<span>View on Map</span>
								</a>
							{/if}
							
							<button 
								on:click={deletePhoto}
								class="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg font-medium inline-flex items-center space-x-2"
							>
								<Trash2 class="w-5 h-5" />
								<span>Delete</span>
							</button>
						</div>
					</div>
				</div>
			</div>
		{/if}
	</div>
</div>