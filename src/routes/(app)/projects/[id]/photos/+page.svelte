<script lang="ts">
	import { page } from '$app/stores'
	import { onMount } from 'svelte'
	import { 
		Camera, 
		MapPin, 
		Calendar, 
		User, 
		MoreVertical,
		Edit,
		Trash2,
		Download,
		Eye
	} from 'lucide-svelte'
	
	const projectId = $derived($page.params.id)
	
	// Mock data - replace with actual service call
	let photos: any[] = []
	let loading = true
	let viewMode = 'grid' // grid | list
	let selectedPhotos: string[] = []
	let showFilters = false
	
	// Filter states
	let filterLocation = 'all' // all | with | without
	let filterDate = ''
	let filterUser = ''
	let searchQuery = ''
	
	onMount(() => {
		loadPhotos()
	})
	
	async function loadPhotos() {
		try {
			// TODO: Replace with actual photos service
			await new Promise(resolve => setTimeout(resolve, 1000))
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
					file_size: 2048000,
					mime_type: 'image/jpeg'
				},
				{
					id: '2',
					title: 'Corner Peg Detail',
					description: 'Detail shot of corner survey peg with measurement reference',
					file_path: '/photos/corner-peg-1.jpg',
					location_lat: -41.4550,
					location_lng: 145.9710,
					taken_at: '2024-01-15T10:15:00Z',
					created_at: '2024-01-15T10:20:00Z',
					user_id: 'user1',
					file_size: 1536000,
					mime_type: 'image/jpeg'
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
					user_id: 'user1',
					file_size: 3072000,
					mime_type: 'image/jpeg'
				},
				{
					id: '4',
					title: 'Boundary Marker',
					description: 'Historical boundary marker discovered during survey',
					file_path: '/photos/boundary-marker.jpg',
					location_lat: -41.4552,
					location_lng: 145.9708,
					taken_at: '2024-01-15T14:30:00Z',
					created_at: '2024-01-15T14:35:00Z',
					user_id: 'user2',
					file_size: 2560000,
					mime_type: 'image/jpeg'
				},
				{
					id: '5',
					title: 'Site Overview',
					description: 'Wide angle view of survey area showing terrain and access',
					file_path: '/photos/site-overview.jpg',
					location_lat: -41.4548,
					location_lng: 145.9705,
					taken_at: '2024-01-15T16:00:00Z',
					created_at: '2024-01-15T16:05:00Z',
					user_id: 'user1',
					file_size: 4096000,
					mime_type: 'image/jpeg'
				},
				{
					id: '6',
					title: 'Access Road',
					description: 'Vehicle access point to survey area',
					file_path: '/photos/access-road.jpg',
					location_lat: null,
					location_lng: null,
					taken_at: '2024-01-15T08:00:00Z',
					created_at: '2024-01-15T17:00:00Z',
					user_id: 'user2',
					file_size: 1800000,
					mime_type: 'image/jpeg'
				}
			]
		} catch (error) {
			// Failed to load photos
		} finally {
			loading = false
		}
	}
	
	function togglePhotoSelection(photoId: string) {
		if (selectedPhotos.includes(photoId)) {
			selectedPhotos = selectedPhotos.filter(id => id !== photoId)
		} else {
			selectedPhotos = [...selectedPhotos, photoId]
		}
	}
	
	function formatDate(dateString: string): string {
		return new Date(dateString).toLocaleDateString('en-AU', {
			month: 'short',
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
	
	// Filter photos based on current filter states
	const filteredPhotos = $derived(photos.filter(photo => {
		// Location filter
		if (filterLocation === 'with' && (!photo.location_lat || !photo.location_lng)) return false
		if (filterLocation === 'without' && (photo.location_lat && photo.location_lng)) return false
		
		// Date filter
		if (filterDate && !photo.taken_at?.includes(filterDate)) return false
		
		// User filter
		if (filterUser && photo.user_id !== filterUser) return false
		
		// Search query
		if (searchQuery) {
			const query = searchQuery.toLowerCase()
			return (
				photo.title?.toLowerCase().includes(query) ||
				photo.description?.toLowerCase().includes(query) ||
				photo.user_id.toLowerCase().includes(query)
			)
		}
		
		return true
	}))
	
	// Get unique users for filter
	const users = $derived([...new Set(photos.map(p => p.user_id))])
	
	// Stats
	const stats = $derived({
		total: photos.length,
		withLocation: photos.filter(p => p.location_lat && p.location_lng).length,
		withoutLocation: photos.filter(p => !p.location_lat || !p.location_lng).length,
		totalSize: photos.reduce((sum, p) => sum + (p.file_size || 0), 0)
	})
</script>

<div class="flex flex-col h-full">
	<!-- Filters Panel -->
	<div class="bg-gray-50 border-b border-gray-200 px-4 py-3 {showFilters ? 'block' : 'hidden'}">
		<div class="grid grid-cols-1 md:grid-cols-4 gap-4">
			<!-- Search -->
			<div>
				<label class="block text-xs font-medium text-gray-700 mb-1">Search</label>
				<input 
					bind:value={searchQuery}
					type="text" 
					placeholder="Search photos..."
					class="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
				/>
			</div>
			
			<!-- Location Filter -->
			<div>
				<label class="block text-xs font-medium text-gray-700 mb-1">Location</label>
				<select 
					bind:value={filterLocation}
					class="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
				>
					<option value="all">All Photos</option>
					<option value="with">With Location</option>
					<option value="without">Without Location</option>
				</select>
			</div>
			
			<!-- Date Filter -->
			<div>
				<label class="block text-xs font-medium text-gray-700 mb-1">Date</label>
				<input 
					bind:value={filterDate}
					type="date"
					class="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
				/>
			</div>
			
			<!-- User Filter -->
			<div>
				<label class="block text-xs font-medium text-gray-700 mb-1">User</label>
				<select 
					bind:value={filterUser}
					class="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
				>
					<option value="">All Users</option>
					{#each users as user}
						<option value={user}>{user}</option>
					{/each}
				</select>
			</div>
		</div>
	</div>
	
	<!-- Stats Bar -->
	<div class="bg-white border-b border-gray-200 px-4 py-2">
		<div class="flex items-center justify-between text-sm text-gray-600">
			<div class="flex items-center space-x-6">
				<span>{filteredPhotos.length} of {stats.total} photos</span>
				<span>{stats.withLocation} with location</span>
				<span>{formatFileSize(stats.totalSize)} total</span>
			</div>
			
			<div class="flex items-center space-x-2">
				<button 
					on:click={() => showFilters = !showFilters}
					class="px-2 py-1 text-xs font-medium text-gray-700 bg-gray-100 rounded hover:bg-gray-200"
				>
					{showFilters ? 'Hide' : 'Show'} Filters
				</button>
				
				<div class="flex border border-gray-300 rounded">
					<button 
						on:click={() => viewMode = 'grid'}
						class="px-2 py-1 text-xs font-medium {viewMode === 'grid' ? 'bg-purple-100 text-purple-700' : 'text-gray-700 hover:bg-gray-100'}"
					>
						Grid
					</button>
					<button 
						on:click={() => viewMode = 'list'}
						class="px-2 py-1 text-xs font-medium {viewMode === 'list' ? 'bg-purple-100 text-purple-700' : 'text-gray-700 hover:bg-gray-100'}"
					>
						List
					</button>
				</div>
			</div>
		</div>
	</div>
	
	<!-- Photo Gallery -->
	<div class="flex-1 overflow-y-auto">
		{#if loading}
			<div class="flex items-center justify-center h-full">
				<div class="text-center">
					<div class="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
					<p class="text-gray-500">Loading photos...</p>
				</div>
			</div>
		{:else if filteredPhotos.length === 0}
			<div class="flex items-center justify-center h-full">
				<div class="text-center">
					<Camera class="w-16 h-16 text-gray-400 mx-auto mb-4" />
					<h3 class="text-lg font-medium text-gray-900 mb-2">No photos found</h3>
					<p class="text-gray-500 mb-6">
						{photos.length === 0 ? 'Start by taking photos or uploading existing ones.' : 'Try adjusting your filters.'}
					</p>
					{#if photos.length === 0}
						<div class="flex items-center justify-center space-x-3">
							<a 
								href="/projects/{projectId}/photos/new"
								class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
							>
								<Camera class="w-4 h-4 mr-2" />
								Take Photo
							</a>
							<a 
								href="/projects/{projectId}/photos/upload"
								class="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
							>
								<Upload class="w-4 h-4 mr-2" />
								Upload Files
							</a>
						</div>
					{/if}
				</div>
			</div>
		{:else}
			<div class="p-4">
				{#if viewMode === 'grid'}
					<!-- Grid View -->
					<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
						{#each filteredPhotos as photo}
							<div class="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
								<!-- Photo Thumbnail -->
								<div class="aspect-square bg-gray-100 flex items-center justify-center relative">
									<Camera class="w-8 h-8 text-gray-400" />
									
									<!-- Location Badge -->
									{#if photo.location_lat && photo.location_lng}
										<div class="absolute top-2 left-2 bg-green-500 text-white px-1.5 py-0.5 rounded text-xs font-medium">
											<MapPin class="w-3 h-3 inline mr-1" />
											GPS
										</div>
									{/if}
									
									<!-- Actions -->
									<div class="absolute top-2 right-2">
										<button class="p-1 bg-black bg-opacity-50 text-white rounded hover:bg-opacity-75">
											<MoreVertical class="w-4 h-4" />
										</button>
									</div>
								</div>
								
								<!-- Photo Info -->
								<div class="p-3">
									<h4 class="font-medium text-gray-900 text-sm mb-1 line-clamp-1">
										{photo.title || 'Untitled Photo'}
									</h4>
									{#if photo.description}
										<p class="text-xs text-gray-500 mb-2 line-clamp-2">{photo.description}</p>
									{/if}
									
									<div class="flex items-center justify-between text-xs text-gray-500">
										<div class="flex items-center space-x-2">
											<Calendar class="w-3 h-3" />
											<span>{formatDate(photo.taken_at)}</span>
										</div>
										<span>{formatFileSize(photo.file_size)}</span>
									</div>
									
									<!-- Actions -->
									<div class="flex items-center justify-between mt-3">
										<div class="flex items-center space-x-1">
											<User class="w-3 h-3 text-gray-400" />
											<span class="text-xs text-gray-500">{photo.user_id}</span>
										</div>
										
										<div class="flex items-center space-x-1">
											<button 
												title="View"
												class="p-1 text-gray-400 hover:text-purple-600 rounded"
											>
												<Eye class="w-4 h-4" />
											</button>
											<a 
												href="/projects/{projectId}/photos/{photo.id}/edit"
												title="Edit"
												class="p-1 text-gray-400 hover:text-purple-600 rounded"
											>
												<Edit class="w-4 h-4" />
											</a>
											<button 
												title="Download"
												class="p-1 text-gray-400 hover:text-purple-600 rounded"
											>
												<Download class="w-4 h-4" />
											</button>
										</div>
									</div>
								</div>
							</div>
						{/each}
					</div>
				{:else}
					<!-- List View -->
					<div class="space-y-2">
						{#each filteredPhotos as photo}
							<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow">
								<div class="flex items-center space-x-4">
									<!-- Thumbnail -->
									<div class="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
										<Camera class="w-6 h-6 text-gray-400" />
									</div>
									
									<!-- Info -->
									<div class="flex-1 min-w-0">
										<div class="flex items-center space-x-2 mb-1">
											<h4 class="font-medium text-gray-900 text-sm truncate">
												{photo.title || 'Untitled Photo'}
											</h4>
											{#if photo.location_lat && photo.location_lng}
												<div class="bg-green-100 text-green-800 px-2 py-0.5 rounded text-xs font-medium">
													<MapPin class="w-3 h-3 inline mr-1" />
													GPS
												</div>
											{/if}
										</div>
										
										{#if photo.description}
											<p class="text-sm text-gray-500 mb-2 line-clamp-2">{photo.description}</p>
										{/if}
										
										<div class="flex items-center space-x-4 text-xs text-gray-500">
											<div class="flex items-center space-x-1">
												<Calendar class="w-3 h-3" />
												<span>{formatDate(photo.taken_at)}</span>
											</div>
											<div class="flex items-center space-x-1">
												<User class="w-3 h-3" />
												<span>{photo.user_id}</span>
											</div>
											<span>{formatFileSize(photo.file_size)}</span>
										</div>
									</div>
									
									<!-- Actions -->
									<div class="flex items-center space-x-2">
										<button 
											title="View"
											class="p-2 text-gray-400 hover:text-purple-600 rounded"
										>
											<Eye class="w-4 h-4" />
										</button>
										<a 
											href="/projects/{projectId}/photos/{photo.id}/edit"
											title="Edit"
											class="p-2 text-gray-400 hover:text-purple-600 rounded"
										>
											<Edit class="w-4 h-4" />
										</a>
										<button 
											title="Download"
											class="p-2 text-gray-400 hover:text-purple-600 rounded"
										>
											<Download class="w-4 h-4" />
										</button>
										<button 
											title="More actions"
											class="p-2 text-gray-400 hover:text-purple-600 rounded"
										>
											<MoreVertical class="w-4 h-4" />
										</button>
									</div>
								</div>
							</div>
						{/each}
					</div>
				{/if}
			</div>
		{/if}
	</div>
</div>

<style>
	.line-clamp-1 {
		display: -webkit-box;
		-webkit-line-clamp: 1;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}
	
	.line-clamp-2 {
		display: -webkit-box;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}
	
	.aspect-square {
		aspect-ratio: 1 / 1;
	}
</style>