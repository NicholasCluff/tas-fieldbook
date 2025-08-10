<script lang="ts">
	import { onMount } from 'svelte'
	import { 
		Upload, 
		FileImage, 
		X, 
		Loader2,
		AlertCircle
	} from 'lucide-svelte'
	
	interface Props {
		onFilesSelected: (files: File[]) => void
		onError?: (error: string) => void
		accept?: string
		multiple?: boolean
		maxFiles?: number
		maxSize?: number // in bytes
		className?: string
	}
	
	let {
		onFilesSelected,
		onError,
		accept = 'image/*',
		multiple = true,
		maxFiles = 10,
		maxSize = 10 * 1024 * 1024, // 10MB
		className = ''
	}: Props = $props()
	
	let fileInput: HTMLInputElement
	let dragActive = false
	let processing = false
	
	onMount(() => {
		// Handle paste events for screenshots
		document.addEventListener('paste', handlePaste)
		return () => document.removeEventListener('paste', handlePaste)
	})
	
	function handlePaste(e: ClipboardEvent) {
		const items = e.clipboardData?.items
		if (!items) return
		
		const files: File[] = []
		for (const item of items) {
			if (item.type.indexOf('image') !== -1) {
				const file = item.getAsFile()
				if (file) {
					files.push(file)
				}
			}
		}
		
		if (files.length > 0) {
			handleFiles(files)
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
	
	async function handleFiles(files: File[]) {
		processing = true
		
		try {
			// Validate files
			const validFiles = validateFiles(files)
			if (validFiles.length === 0) {
				return
			}
			
			onFilesSelected(validFiles)
		} catch (error) {
			if (onError) {
				onError('Error processing files. Please try again.')
			}
		} finally {
			processing = false
		}
	}
	
	function validateFiles(files: File[]): File[] {
		const validFiles: File[] = []
		const errors: string[] = []
		
		for (const file of files) {
			// Check file type
			if (!file.type.startsWith('image/')) {
				errors.push(`${file.name} is not an image file`)
				continue
			}
			
			// Check file size
			if (file.size > maxSize) {
				errors.push(`${file.name} is too large (max ${formatFileSize(maxSize)})`)
				continue
			}
			
			validFiles.push(file)
			
			// Check max files limit
			if (validFiles.length >= maxFiles) {
				break
			}
		}
		
		if (errors.length > 0 && onError) {
			onError(errors.join(', '))
		}
		
		return validFiles
	}
	
	function formatFileSize(bytes: number): string {
		if (bytes === 0) return '0 Bytes'
		const k = 1024
		const sizes = ['Bytes', 'KB', 'MB', 'GB']
		const i = Math.floor(Math.log(bytes) / Math.log(k))
		return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
	}
	
	function openFileDialog() {
		fileInput.click()
	}
</script>

<div class="relative {className}">
	<div 
		class="border-2 border-dashed rounded-lg p-8 text-center transition-colors {dragActive ? 'border-purple-500 bg-purple-50' : 'border-gray-300 bg-white'}"
		on:dragover={handleDragOver}
		on:dragleave={handleDragLeave}
		on:drop={handleDrop}
	>
		{#if processing}
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
					on:click={openFileDialog}
					class="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-medium inline-flex items-center space-x-2"
				>
					<Upload class="w-5 h-5" />
					<span>Choose Files</span>
				</button>
				
				<div class="mt-6 text-sm text-gray-500">
					<p>Supported: JPG, PNG, HEIC, WebP</p>
					<p>Max {maxFiles} files, {formatFileSize(maxSize)} each</p>
					{#if multiple}
						<p>You can also paste screenshots (Ctrl+V)</p>
					{/if}
				</div>
			</div>
		{/if}
	</div>
	
	<!-- Hidden file input -->
	<input 
		bind:this={fileInput}
		type="file" 
		{accept}
		{multiple}
		class="hidden"
		on:change={handleFileInput}
	/>
</div>