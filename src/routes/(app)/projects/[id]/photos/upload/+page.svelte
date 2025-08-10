<script lang="ts">
	import { page } from '$app/stores'
	import { onMount } from 'svelte'
	import { 
		Upload, 
		X, 
		Check, 
		AlertCircle, 
		FileImage, 
		Loader2,
		MapPin,
		Calendar,
		Camera,
		Trash2,
		Edit
	} from 'lucide-svelte'
	
	const projectId = $derived($page.params.id)
	
	let fileInput: HTMLInputElement
	let dragActive = false
	let files: File[] = []
	let uploading = false
	let uploadError: string | null = null
	let uploadProgress = 0
	
	// File processing states
	let processingFiles = false
	let processedFiles: Array<{
		file: File
		preview: string
		metadata: {
			title: string
			description: string
			location: { lat: number; lng: number } | null
			takenAt: string | null
			camera: string | null
			fileSize: number
			mimeType: string
		}
	}> = []
	
	onMount(() => {
		// Handle paste events for screenshots
		document.addEventListener('paste', handlePaste)
		return () => document.removeEventListener('paste', handlePaste)
	})
	
	function handlePaste(e: ClipboardEvent) {
		const items = e.clipboardData?.items
		if (!items) return
		
		for (const item of items) {
			if (item.type.indexOf('image') !== -1) {
				const file = item.getAsFile()
				if (file) {
					handleFiles([file])
				}
			}
		}
	}
	
	function handleDragOver(e: DragEvent) {
		e.preventDefault()
		dragActive = true
	}
	
	function handleDragLeave(e: DragEvent) {
		e.preventDefault()
		dragActive = false
	}
	
	function handleDrop(e: DragEvent) {
		e.preventDefault()
		dragActive = false
		
		const droppedFiles = Array.from(e.dataTransfer?.files || [])
		const imageFiles = droppedFiles.filter(file => file.type.startsWith('image/'))
		
		if (imageFiles.length > 0) {
			handleFiles(imageFiles)
		}
	}
	
	function handleFileInput(e: Event) {
		const target = e.target as HTMLInputElement
		const selectedFiles = Array.from(target.files || [])
		handleFiles(selectedFiles)
	}
	
	async function handleFiles(newFiles: File[]) {
		processingFiles = true
		uploadError = null
		
		try {
			const processed = await Promise.all(
				newFiles.map(async (file) => {
					const preview = await createPreview(file)
					const metadata = await extractMetadata(file)
					
					return {
						file,
						preview,
						metadata: {
							title: generateTitle(file),
							description: '',
							location: metadata.location,
							takenAt: metadata.takenAt,
							camera: metadata.camera,
							fileSize: file.size,
							mimeType: file.type
						}
					}
				})
			)
			
			processedFiles = [...processedFiles, ...processed]
			files = [...files, ...newFiles]
		} catch (error) {
			uploadError = 'Error processing files. Please try again.'
		} finally {
			processingFiles = false
		}
	}
	
	async function createPreview(file: File): Promise<string> {
		return new Promise((resolve, reject) => {
			const reader = new FileReader()
			reader.onload = (e) => resolve(e.target?.result as string)
			reader.onerror = reject
			reader.readAsDataURL(file)
		})
	}
	
	async function extractMetadata(file: File): Promise<{
		location: { lat: number; lng: number } | null
		takenAt: string | null
		camera: string | null
	}> {
		// TODO: Implement EXIF metadata extraction
		// For now, return mock data
		return {
			location: Math.random() > 0.5 ? {
				lat: -41.4545 + (Math.random() - 0.5) * 0.01,
				lng: 145.9707 + (Math.random() - 0.5) * 0.01
			} : null,
			takenAt: new Date(file.lastModified).toISOString(),
			camera: Math.random() > 0.7 ? 'iPhone 15 Pro' : null
		}
	}
	
	function generateTitle(file: File): string {
		const baseName = file.name.replace(/\.[^/.]+$/, '')
		return baseName.charAt(0).toUpperCase() + baseName.slice(1).replace(/[-_]/g, ' ')
	}
	
	function removeFile(index: number) {
		files.splice(index, 1)
		processedFiles.splice(index, 1)
		files = files
		processedFiles = processedFiles
	}
	
	function updateMetadata(index: number, field: string, value: string) {
		processedFiles[index].metadata[field] = value
		processedFiles = processedFiles
	}
	
	async function uploadFiles() {
		if (processedFiles.length === 0) return
		
		uploading = true
		uploadError = null
		uploadProgress = 0
		
		try {
			for (let i = 0; i < processedFiles.length; i++) {
				const processedFile = processedFiles[i]
				
				// TODO: Implement actual upload logic
				// 1. Upload file to Supabase Storage
				// 2. Save photo record to database
				// 3. Handle offline storage if needed
				
				await new Promise(resolve => setTimeout(resolve, 1000)) // Mock upload delay
				
				uploadProgress = ((i + 1) / processedFiles.length) * 100
			}
			
			// Success - redirect to photos page
			window.location.href = `/projects/${projectId}/photos`
		} catch (error) {
			uploadError = 'Failed to upload files. Please try again.'
		} finally {
			uploading = false
		}
	}
	
	function formatFileSize(bytes: number): string {
		if (bytes === 0) return '0 Bytes'
		const k = 1024
		const sizes = ['Bytes', 'KB', 'MB', 'GB']
		const i = Math.floor(Math.log(bytes) / Math.log(k))
		return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
	}
	
	function formatDate(dateString: string): string {
		return new Date(dateString).toLocaleDateString('en-AU', {
			month: 'short',
			day: 'numeric',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		})
	}
</script>

<div class="flex flex-col h-full bg-gray-50">
	<!-- Header -->
	<div class="bg-white border-b border-gray-200 p-4">
		<div class="flex items-center justify-between">
			<div class="flex items-center space-x-3">
				<a 
					href="/projects/{projectId}/photos"
					class="p-2 hover:bg-gray-100 rounded-lg transition-colors"
				>
					<X class="w-5 h-5" />
				</a>
				<h1 class="text-lg font-semibold text-gray-900">Upload Photos</h1>
			</div>
			
			{#if processedFiles.length > 0}
				<div class="flex items-center space-x-3">
					<span class="text-sm text-gray-600">{processedFiles.length} file{processedFiles.length !== 1 ? 's' : ''} ready</span>
					<button 
						on:click={uploadFiles}
						disabled={uploading}
						class="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg font-medium flex items-center space-x-2"
					>
						{#if uploading}
							<Loader2 class="w-4 h-4 animate-spin" />
							<span>Uploading...</span>
						{:else}
							<Upload class="w-4 h-4" />
							<span>Upload All</span>
						{/if}
					</button>
				</div>
			{/if}
		</div>
	</div>
	
	<!-- Upload Progress -->
	{#if uploading}
		<div class="bg-white border-b border-gray-200 p-4">
			<div class="flex items-center space-x-3">
				<div class="flex-1">
					<div class="flex items-center justify-between text-sm text-gray-600 mb-1">
						<span>Uploading photos...</span>
						<span>{Math.round(uploadProgress)}%</span>
					</div>
					<div class="w-full bg-gray-200 rounded-full h-2">
						<div 
							class="bg-purple-600 h-2 rounded-full transition-all duration-300"
							style="width: {uploadProgress}%"
						></div>
					</div>
				</div>
			</div>
		</div>
	{/if}
	
	<!-- Error Message -->
	{#if uploadError}
		<div class="bg-red-50 border-l-4 border-red-400 p-4 m-4 rounded">
			<div class="flex items-center space-x-2">
				<AlertCircle class="w-5 h-5 text-red-400" />
				<span class="text-red-700">{uploadError}</span>
			</div>
		</div>
	{/if}
	
	<!-- Main Content -->
	<div class="flex-1 overflow-y-auto p-4">
		{#if processedFiles.length === 0}
			<!-- Upload Zone -->
			<div class="h-full flex items-center justify-center">
				<div 
					class="border-2 border-dashed rounded-lg p-8 text-center max-w-md w-full {dragActive ? 'border-purple-500 bg-purple-50' : 'border-gray-300 bg-white'}"
					on:dragover={handleDragOver}
					on:dragleave={handleDragLeave}
					on:drop={handleDrop}
				>
					{#if processingFiles}
						<div class="text-center">
							<Loader2 class="w-12 h-12 animate-spin text-purple-600 mx-auto mb-4" />
							<p class="text-gray-600">Processing files...</p>
						</div>
					{:else}
						<div class="text-center">
							<FileImage class="w-16 h-16 text-gray-400 mx-auto mb-4" />
							<h3 class="text-lg font-medium text-gray-900 mb-2">Upload Photos</h3>
							<p class="text-gray-600 mb-6">
								Drag and drop your photos here, or click to select files
							</p>
							
							<button 
								on:click={() => fileInput.click()}
								class="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-medium inline-flex items-center space-x-2"
							>
								<Upload class="w-5 h-5" />
								<span>Choose Files</span>
							</button>
							
							<input 
								bind:this={fileInput}
								type="file" 
								accept="image/*" 
								multiple 
								class="hidden"
								on:change={handleFileInput}
							/>
							
							<div class="mt-6 text-sm text-gray-500">
								<p>Supported: JPG, PNG, HEIC, WebP</p>
								<p>You can also paste screenshots (Ctrl+V)</p>
							</div>
						</div>
					{/if}
				</div>
			</div>
		{:else}
			<!-- File List -->
			<div class="space-y-4">
				{#each processedFiles as processedFile, index}
					<div class="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
						<div class="p-4">
							<div class="flex space-x-4">
								<!-- Preview -->
								<div class="w-24 h-24 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
									<img 
										src={processedFile.preview} 
										alt="Preview" 
										class="w-full h-full object-cover"
									/>
								</div>
								
								<!-- Metadata Form -->
								<div class="flex-1 space-y-3">
									<div class="grid grid-cols-1 md:grid-cols-2 gap-3">
										<!-- Title -->
										<div>
											<label class="block text-sm font-medium text-gray-700 mb-1">Title</label>
											<input 
												type="text" 
												bind:value={processedFile.metadata.title}
												class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
											/>
										</div>
										
										<!-- Description -->
										<div>
											<label class="block text-sm font-medium text-gray-700 mb-1">Description</label>
											<input 
												type="text" 
												bind:value={processedFile.metadata.description}
												placeholder="Add description..."
												class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
											/>
										</div>
									</div>
									
									<!-- File Info -->
									<div class="flex items-center space-x-4 text-sm text-gray-500">
										<div class="flex items-center space-x-1">
											<FileImage class="w-4 h-4" />
											<span>{formatFileSize(processedFile.metadata.fileSize)}</span>
										</div>
										
										{#if processedFile.metadata.takenAt}
											<div class="flex items-center space-x-1">
												<Calendar class="w-4 h-4" />
												<span>{formatDate(processedFile.metadata.takenAt)}</span>
											</div>
										{/if}
										
										{#if processedFile.metadata.camera}
											<div class="flex items-center space-x-1">
												<Camera class="w-4 h-4" />
												<span>{processedFile.metadata.camera}</span>
											</div>
										{/if}
										
										{#if processedFile.metadata.location}
											<div class="flex items-center space-x-1">
												<MapPin class="w-4 h-4 text-green-500" />
												<span>GPS Location</span>
											</div>
										{:else}
											<div class="flex items-center space-x-1">
												<MapPin class="w-4 h-4 text-gray-400" />
												<span>No Location</span>
											</div>
										{/if}
									</div>
								</div>
								
								<!-- Actions -->
								<div class="flex flex-col space-y-2">
									<button 
										on:click={() => removeFile(index)}
										class="p-2 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50"
										title="Remove file"
									>
										<Trash2 class="w-4 h-4" />
									</button>
									
									<button 
										class="p-2 text-gray-400 hover:text-purple-600 rounded-lg hover:bg-purple-50"
										title="Edit metadata"
									>
										<Edit class="w-4 h-4" />
									</button>
								</div>
							</div>
						</div>
					</div>
				{/each}
				
				<!-- Add More Files -->
				<div class="text-center py-8">
					<button 
						on:click={() => fileInput.click()}
						class="text-purple-600 hover:text-purple-700 font-medium inline-flex items-center space-x-2"
					>
						<Upload class="w-5 h-5" />
						<span>Add More Files</span>
					</button>
				</div>
			</div>
		{/if}
	</div>
</div>

<input 
	bind:this={fileInput}
	type="file" 
	accept="image/*" 
	multiple 
	class="hidden"
	on:change={handleFileInput}
/>