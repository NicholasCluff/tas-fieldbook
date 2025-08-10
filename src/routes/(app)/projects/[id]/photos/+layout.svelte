<script lang="ts">
	import { page } from '$app/stores'
	import { Camera, Upload, Grid, Map, Filter } from 'lucide-svelte'
	
	const { children } = $props()
	
	const projectId = $derived($page.params.id)
	const currentPath = $derived($page.url.pathname)
	const isMainGallery = $derived(currentPath.endsWith('/photos'))
	const isCapture = $derived(currentPath.includes('/photos/new'))
	const isUpload = $derived(currentPath.includes('/photos/upload'))
</script>

<div class="flex flex-col h-full">
	<!-- Header -->
	<div class="bg-white border-b border-gray-200 px-4 py-3">
		<div class="flex items-center justify-between">
			<div class="flex items-center space-x-3">
				<h1 class="text-lg font-semibold text-gray-900">Photos</h1>
				<div class="flex items-center space-x-1 text-sm text-gray-500">
					<span>•</span>
					<span>Project Gallery</span>
				</div>
			</div>
			
			<!-- Action Buttons -->
			{#if isMainGallery}
				<div class="flex items-center space-x-2">
					<a 
						href="/projects/{projectId}/photos/new"
						class="inline-flex items-center px-3 py-1.5 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
					>
						<Camera class="w-4 h-4 mr-1.5" />
						Camera
					</a>
					
					<a 
						href="/projects/{projectId}/photos/upload"
						class="inline-flex items-center px-3 py-1.5 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
					>
						<Upload class="w-4 h-4 mr-1.5" />
						Upload
					</a>
				</div>
			{/if}
		</div>
		
		<!-- Navigation Tabs -->
		{#if isMainGallery}
			<div class="flex space-x-6 mt-3">
				<button class="flex items-center space-x-2 px-3 py-1.5 text-sm font-medium text-purple-600 border-b-2 border-purple-600">
					<Grid class="w-4 h-4" />
					<span>Gallery</span>
				</button>
				
				<button class="flex items-center space-x-2 px-3 py-1.5 text-sm font-medium text-gray-500 hover:text-gray-700">
					<Map class="w-4 h-4" />
					<span>Map View</span>
				</button>
				
				<button class="flex items-center space-x-2 px-3 py-1.5 text-sm font-medium text-gray-500 hover:text-gray-700">
					<Filter class="w-4 h-4" />
					<span>Filters</span>
				</button>
			</div>
		{/if}
	</div>
	
	<!-- Main Content -->
	<div class="flex-1 overflow-hidden">
		{@render children()}
	</div>
</div>