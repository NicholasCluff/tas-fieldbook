<script lang="ts">
	import { 
		X, 
		ChevronLeft, 
		ChevronRight, 
		Download, 
		Edit,
		Trash2,
		MapPin,
		Calendar,
		User,
		Camera,
		Share,
		ZoomIn,
		ZoomOut,
		RotateCw
	} from 'lucide-svelte'
	
	interface Photo {
		id: string
		title: string | null
		description: string | null
		file_path: string
		location_lat: number | null
		location_lng: number | null
		taken_at: string | null
		created_at: string
		user_id: string
		file_size: number | null
		mime_type: string | null
		metadata?: {
			camera?: string
			exposure?: string
			iso?: string
			aperture?: string
			focalLength?: string
			direction?: number
		}
	}
	
	interface Props {
		photos: Photo[]
		currentIndex: number
		projectId: string
		onClose: () => void
		onNext?: () => void
		onPrevious?: () => void
		onDelete?: (photo: Photo) => void
		onDownload?: (photo: Photo) => void
	}
	
	let {
		photos,
		currentIndex,
		projectId,
		onClose,
		onNext,
		onPrevious,
		onDelete,
		onDownload
	}: Props = $props()
	
	let showInfo = false
	let zoom = 1
	let rotation = 0
	
	const currentPhoto = $derived(photos[currentIndex])
	
	function handleKeydown(e: KeyboardEvent) {
		switch (e.key) {
			case 'Escape':
				onClose()
				break
			case 'ArrowLeft':
				if (onPrevious) onPrevious()
				break
			case 'ArrowRight':
				if (onNext) onNext()
				break
			case 'i':
			case 'I':
				showInfo = !showInfo
				break
		}
	}
	
	function handleDownload() {
		if (onDownload) {
			onDownload(currentPhoto)
		}
	}
	
	function handleDelete() {
		if (onDelete) {
			onDelete(currentPhoto)
		} else {
			if (confirm('Are you sure you want to delete this photo?')) {
				// Photo deletion would be handled here
			}
		}
	}
	
	function zoomIn() {
		zoom = Math.min(zoom * 1.5, 4)
	}
	
	function zoomOut() {
		zoom = Math.max(zoom / 1.5, 0.5)
	}
	
	function resetZoom() {
		zoom = 1
		rotation = 0
	}
	
	function rotate() {
		rotation = (rotation + 90) % 360
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
</script>

<svelte:window on:keydown={handleKeydown} />

<div class="fixed inset-0 bg-black bg-opacity-95 flex items-center justify-center z-50">
	<!-- Header -->
	<div class="absolute top-0 left-0 right-0 bg-black bg-opacity-75 text-white p-4 z-10">
		<div class="flex items-center justify-between">
			<div class="flex items-center space-x-4">
				<h3 class="text-lg font-medium">
					{currentPhoto.title || 'Untitled Photo'}
				</h3>
				<span class="text-sm text-gray-300">
					{currentIndex + 1} of {photos.length}
				</span>
			</div>
			
			<div class="flex items-center space-x-2">
				<!-- Zoom Controls -->
				<button 
					on:click={zoomOut}
					class="p-2 hover:bg-white hover:bg-opacity-20 rounded-full transition-colors"
					title="Zoom out"
				>
					<ZoomOut class="w-5 h-5" />
				</button>
				
				<button 
					on:click={resetZoom}
					class="px-3 py-1 text-sm hover:bg-white hover:bg-opacity-20 rounded transition-colors"
					title="Reset zoom"
				>
					{Math.round(zoom * 100)}%
				</button>
				
				<button 
					on:click={zoomIn}
					class="p-2 hover:bg-white hover:bg-opacity-20 rounded-full transition-colors"
					title="Zoom in"
				>
					<ZoomIn class="w-5 h-5" />
				</button>
				
				<!-- Rotate -->
				<button 
					on:click={rotate}
					class="p-2 hover:bg-white hover:bg-opacity-20 rounded-full transition-colors"
					title="Rotate"
				>
					<RotateCw class="w-5 h-5" />
				</button>
				
				<!-- Info Toggle -->
				<button 
					on:click={() => showInfo = !showInfo}
					class="p-2 hover:bg-white hover:bg-opacity-20 rounded-full transition-colors {showInfo ? 'bg-white bg-opacity-20' : ''}"
					title="Toggle info (I)"
				>
					<span class="w-5 h-5 flex items-center justify-center text-sm font-bold">i</span>
				</button>
				
				<!-- Share -->
				<button 
					class="p-2 hover:bg-white hover:bg-opacity-20 rounded-full transition-colors"
					title="Share"
				>
					<Share class="w-5 h-5" />
				</button>
				
				<!-- Download -->
				<button 
					on:click={handleDownload}
					class="p-2 hover:bg-white hover:bg-opacity-20 rounded-full transition-colors"
					title="Download"
				>
					<Download class="w-5 h-5" />
				</button>
				
				<!-- Edit -->
				<a 
					href="/projects/{projectId}/photos/{currentPhoto.id}/edit"
					class="p-2 hover:bg-white hover:bg-opacity-20 rounded-full transition-colors"
					title="Edit"
				>
					<Edit class="w-5 h-5" />
				</a>
				
				<!-- Delete -->
				<button 
					on:click={handleDelete}
					class="p-2 hover:bg-red-500 hover:bg-opacity-20 rounded-full transition-colors"
					title="Delete"
				>
					<Trash2 class="w-5 h-5" />
				</button>
				
				<!-- Close -->
				<button 
					on:click={onClose}
					class="p-2 hover:bg-white hover:bg-opacity-20 rounded-full transition-colors"
					title="Close (Esc)"
				>
					<X class="w-5 h-5" />
				</button>
			</div>
		</div>
	</div>
	
	<!-- Navigation Buttons -->
	{#if photos.length > 1}
		<button 
			on:click={onPrevious}
			disabled={currentIndex === 0}
			class="absolute left-4 top-1/2 transform -translate-y-1/2 p-3 bg-black bg-opacity-50 text-white rounded-full hover:bg-opacity-75 disabled:opacity-30 disabled:cursor-not-allowed z-10"
			title="Previous (←)"
		>
			<ChevronLeft class="w-6 h-6" />
		</button>
		
		<button 
			on:click={onNext}
			disabled={currentIndex === photos.length - 1}
			class="absolute right-4 top-1/2 transform -translate-y-1/2 p-3 bg-black bg-opacity-50 text-white rounded-full hover:bg-opacity-75 disabled:opacity-30 disabled:cursor-not-allowed z-10"
			title="Next (→)"
		>
			<ChevronRight class="w-6 h-6" />
		</button>
	{/if}
	
	<!-- Photo Display -->
	<div class="w-full h-full flex items-center justify-center p-20">
		<div 
			class="max-w-full max-h-full overflow-hidden transition-transform duration-200"
			style="transform: scale({zoom}) rotate({rotation}deg)"
		>
			<!-- TODO: Replace with actual image -->
			<div class="w-96 h-96 bg-gray-800 rounded-lg flex items-center justify-center">
				<div class="text-center text-white">
					<Camera class="w-24 h-24 mx-auto mb-4 text-gray-400" />
					<p class="text-gray-300">Photo: {currentPhoto.file_path}</p>
				</div>
			</div>
		</div>
	</div>
	
	<!-- Info Panel -->
	{#if showInfo}
		<div class="absolute bottom-0 left-0 right-0 bg-black bg-opacity-90 text-white p-6 max-h-80 overflow-y-auto">
			<div class="max-w-4xl mx-auto">
				<div class="grid grid-cols-1 md:grid-cols-3 gap-6">
					<!-- Basic Info -->
					<div>
						<h4 class="text-lg font-medium mb-3">Details</h4>
						<div class="space-y-2 text-sm">
							<div class="flex items-center space-x-2">
								<Calendar class="w-4 h-4 text-gray-400" />
								<span>
									{currentPhoto.taken_at ? formatDate(currentPhoto.taken_at) : 'Date unknown'}
								</span>
							</div>
							
							<div class="flex items-center space-x-2">
								<User class="w-4 h-4 text-gray-400" />
								<span>By {currentPhoto.user_id}</span>
							</div>
							
							{#if currentPhoto.file_size}
								<div class="flex items-center space-x-2">
									<span class="text-gray-400">Size:</span>
									<span>{formatFileSize(currentPhoto.file_size)}</span>
								</div>
							{/if}
							
							{#if currentPhoto.location_lat && currentPhoto.location_lng}
								<div class="flex items-center space-x-2">
									<MapPin class="w-4 h-4 text-green-400" />
									<span>
										{currentPhoto.location_lat.toFixed(6)}, {currentPhoto.location_lng.toFixed(6)}
									</span>
								</div>
							{/if}
						</div>
					</div>
					
					<!-- Description -->
					<div>
						<h4 class="text-lg font-medium mb-3">Description</h4>
						<p class="text-sm text-gray-300">
							{currentPhoto.description || 'No description provided'}
						</p>
					</div>
					
					<!-- Camera Info -->
					{#if currentPhoto.metadata}
						<div>
							<h4 class="text-lg font-medium mb-3">Camera Info</h4>
							<div class="space-y-2 text-sm">
								{#if currentPhoto.metadata.camera}
									<div class="flex justify-between">
										<span class="text-gray-400">Camera:</span>
										<span>{currentPhoto.metadata.camera}</span>
									</div>
								{/if}
								
								{#if currentPhoto.metadata.exposure}
									<div class="flex justify-between">
										<span class="text-gray-400">Exposure:</span>
										<span>{currentPhoto.metadata.exposure}</span>
									</div>
								{/if}
								
								{#if currentPhoto.metadata.iso}
									<div class="flex justify-between">
										<span class="text-gray-400">ISO:</span>
										<span>{currentPhoto.metadata.iso}</span>
									</div>
								{/if}
								
								{#if currentPhoto.metadata.aperture}
									<div class="flex justify-between">
										<span class="text-gray-400">Aperture:</span>
										<span>{currentPhoto.metadata.aperture}</span>
									</div>
								{/if}
								
								{#if currentPhoto.metadata.focalLength}
									<div class="flex justify-between">
										<span class="text-gray-400">Focal Length:</span>
										<span>{currentPhoto.metadata.focalLength}</span>
									</div>
								{/if}
							</div>
						</div>
					{/if}
				</div>
			</div>
		</div>
	{/if}
</div>