<script lang="ts">
	import PhotoCard from './PhotoCard.svelte'
	
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
		photos: Photo[]
		projectId: string
		loading?: boolean
		selectedPhotos?: string[]
		selectionMode?: boolean
		onPhotoSelect?: (photoId: string) => void
		onPhotoView?: (photo: Photo) => void
		onPhotoEdit?: (photo: Photo) => void
		onPhotoDelete?: (photo: Photo) => void
		onPhotoDownload?: (photo: Photo) => void
	}
	
	let {
		photos,
		projectId,
		loading = false,
		selectedPhotos = [],
		selectionMode = false,
		onPhotoSelect,
		onPhotoView,
		onPhotoEdit,
		onPhotoDelete,
		onPhotoDownload
	}: Props = $props()
	
	function handlePhotoView(photo: Photo) {
		if (onPhotoView) {
			onPhotoView(photo)
		} else {
			// Default behavior - navigate to photo detail
			window.location.href = `/projects/${projectId}/photos/${photo.id}`
		}
	}
	
	function handlePhotoEdit(photo: Photo) {
		if (onPhotoEdit) {
			onPhotoEdit(photo)
		} else {
			// Default behavior - navigate to photo edit
			window.location.href = `/projects/${projectId}/photos/${photo.id}/edit`
		}
	}
	
	function handlePhotoDelete(photo: Photo) {
		if (onPhotoDelete) {
			onPhotoDelete(photo)
		} else {
			// Default behavior - confirm and delete
			if (confirm('Are you sure you want to delete this photo?')) {
				// Photo deletion would be handled here
			}
		}
	}
	
	function handlePhotoDownload(photo: Photo) {
		if (onPhotoDownload) {
			onPhotoDownload(photo)
		} else {
			// Default behavior - download photo
			// Photo download would be handled here
		}
	}
</script>

<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
	{#each photos as photo}
		<PhotoCard 
			{photo}
			{projectId}
			selected={selectedPhotos.includes(photo.id)}
			onSelect={selectionMode ? onPhotoSelect : undefined}
			onView={handlePhotoView}
			onEdit={handlePhotoEdit}
			onDelete={handlePhotoDelete}
			onDownload={handlePhotoDownload}
		/>
	{/each}
	
	{#if loading}
		<!-- Loading Skeletons -->
		{#each Array(8) as _}
			<div class="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
				<div class="aspect-square bg-gray-200 animate-pulse"></div>
				<div class="p-3 space-y-2">
					<div class="h-4 bg-gray-200 rounded animate-pulse"></div>
					<div class="h-3 bg-gray-200 rounded animate-pulse w-3/4"></div>
					<div class="h-3 bg-gray-200 rounded animate-pulse w-1/2"></div>
				</div>
			</div>
		{/each}
	{/if}
</div>

<style>
	.aspect-square {
		aspect-ratio: 1 / 1;
	}
</style>