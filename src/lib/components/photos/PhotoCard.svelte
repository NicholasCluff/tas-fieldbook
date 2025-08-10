<script lang="ts">
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
	}
	
	interface Props {
		photo: Photo
		projectId: string
		selected?: boolean
		onSelect?: (photoId: string) => void
		onView?: (photo: Photo) => void
		onEdit?: (photo: Photo) => void
		onDelete?: (photo: Photo) => void
		onDownload?: (photo: Photo) => void
	}
	
	let {
		photo,
		projectId,
		selected = false,
		onSelect,
		onView,
		onEdit,
		onDelete,
		onDownload
	}: Props = $props()
	
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
	
	function handleCardClick() {
		if (onSelect) {
			onSelect(photo.id)
		}
	}
	
	function handleView(e: Event) {
		e.stopPropagation()
		if (onView) {
			onView(photo)
		}
	}
	
	function handleEdit(e: Event) {
		e.stopPropagation()
		if (onEdit) {
			onEdit(photo)
		}
	}
	
	function handleDelete(e: Event) {
		e.stopPropagation()
		if (onDelete) {
			onDelete(photo)
		}
	}
	
	function handleDownload(e: Event) {
		e.stopPropagation()
		if (onDownload) {
			onDownload(photo)
		}
	}
</script>

<div 
	class="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow cursor-pointer {selected ? 'ring-2 ring-purple-500' : ''}"
	on:click={handleCardClick}
>
	<!-- Photo Thumbnail -->
	<div class="aspect-square bg-gray-100 flex items-center justify-center relative">
		<!-- TODO: Replace with actual image -->
		<Camera class="w-8 h-8 text-gray-400" />
		
		<!-- Location Badge -->
		{#if photo.location_lat && photo.location_lng}
			<div class="absolute top-2 left-2 bg-green-500 text-white px-1.5 py-0.5 rounded text-xs font-medium">
				<MapPin class="w-3 h-3 inline mr-1" />
				GPS
			</div>
		{/if}
		
		<!-- Selection Checkbox -->
		{#if onSelect}
			<div class="absolute top-2 right-2">
				<input 
					type="checkbox" 
					checked={selected}
					on:change={handleCardClick}
					class="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
				/>
			</div>
		{/if}
		
		<!-- Actions Menu -->
		{#if !onSelect}
			<div class="absolute top-2 right-2">
				<button class="p-1 bg-black bg-opacity-50 text-white rounded hover:bg-opacity-75">
					<MoreVertical class="w-4 h-4" />
				</button>
			</div>
		{/if}
	</div>
	
	<!-- Photo Info -->
	<div class="p-3">
		<h4 class="font-medium text-gray-900 text-sm mb-1 line-clamp-1">
			{photo.title || 'Untitled Photo'}
		</h4>
		
		{#if photo.description}
			<p class="text-xs text-gray-500 mb-2 line-clamp-2">{photo.description}</p>
		{/if}
		
		<div class="flex items-center justify-between text-xs text-gray-500 mb-2">
			<div class="flex items-center space-x-2">
				<Calendar class="w-3 h-3" />
				<span>{photo.taken_at ? formatDate(photo.taken_at) : 'No date'}</span>
			</div>
			{#if photo.file_size}
				<span>{formatFileSize(photo.file_size)}</span>
			{/if}
		</div>
		
		<!-- Bottom Row -->
		<div class="flex items-center justify-between">
			<div class="flex items-center space-x-1">
				<User class="w-3 h-3 text-gray-400" />
				<span class="text-xs text-gray-500">{photo.user_id}</span>
			</div>
			
			<div class="flex items-center space-x-1">
				<button 
					on:click={handleView}
					title="View"
					class="p-1 text-gray-400 hover:text-purple-600 rounded"
				>
					<Eye class="w-4 h-4" />
				</button>
				
				<button 
					on:click={handleEdit}
					title="Edit"
					class="p-1 text-gray-400 hover:text-purple-600 rounded"
				>
					<Edit class="w-4 h-4" />
				</button>
				
				<button 
					on:click={handleDownload}
					title="Download"
					class="p-1 text-gray-400 hover:text-purple-600 rounded"
				>
					<Download class="w-4 h-4" />
				</button>
			</div>
		</div>
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