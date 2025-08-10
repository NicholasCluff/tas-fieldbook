<script lang="ts">
	import { createEventDispatcher } from 'svelte'
	import { Upload, X, FileText, AlertCircle, CheckCircle } from 'lucide-svelte'
	import { searchDocumentsService } from '$lib/services/searchDocuments.service.js'
	import { pdfProcessingService } from '$lib/services/pdfProcessing.service.js'
	import type { SearchDocument } from '$lib/types/database.js'
	
	export let projectId: string
	export let multiple = false
	export let maxFileSize = 50 * 1024 * 1024 // 50MB default
	export let timeout = 120000 // 2 minutes default timeout
	
	const dispatch = createEventDispatcher<{
		'upload-complete': { documents: SearchDocument[] }
		cancel: void
		error: { message: string }
	}>()
	
	let isDragOver = false
	let files: File[] = []
	let uploading = false
	let uploadProgress = 0
	let documentTitle = ''
	let autoProcess = true
	let validationResults: Array<{ file: File; valid: boolean; error?: string }> = []
	let processingStatus = ''
	let debugMode = false
	let debugLogs: string[] = []
	
	function addDebugLog(message: string) {
		debugLogs = [...debugLogs, `${new Date().toISOString()}: ${message}`]
		// Keep only last 20 logs
		if (debugLogs.length > 20) {
			debugLogs = debugLogs.slice(-20)
		}
	}
	
	// File validation
	async function validateFile(file: File): Promise<{ valid: boolean; error?: string }> {
		console.log(`🔍 [DocumentUpload] Validating file: ${file.name}`, {
			name: file.name,
			size: file.size,
			type: file.type,
			lastModified: new Date(file.lastModified).toISOString()
		})
		
		if (file.type !== 'application/pdf') {
			console.log(`❌ [DocumentUpload] File type validation failed: ${file.type}`)
			return { valid: false, error: 'Only PDF files are allowed' }
		}
		if (file.size > maxFileSize) {
			console.log(`❌ [DocumentUpload] File size validation failed: ${file.size} > ${maxFileSize}`)
			return { valid: false, error: `File size must be less than ${formatFileSize(maxFileSize)}` }
		}
		
		// Validate PDF structure
		try {
			console.log(`🔍 [DocumentUpload] Starting PDF structure validation for: ${file.name}`)
			const validationResult = await pdfProcessingService.validatePDF(file)
			console.log(`🔍 [DocumentUpload] PDF validation result:`, validationResult)
			
			if (!validationResult.success) {
				console.log(`❌ [DocumentUpload] PDF validation service failed: ${validationResult.error}`)
				return { valid: false, error: `PDF validation failed: ${validationResult.error}` }
			}
			
			if (!validationResult.data?.isValid) {
				const errors = validationResult.data?.errors?.join(', ') || 'Unknown PDF error'
				console.log(`❌ [DocumentUpload] PDF structure invalid:`, errors)
				return { valid: false, error: `Invalid PDF: ${errors}` }
			}
			
			if (validationResult.data?.encrypted) {
				console.log(`❌ [DocumentUpload] PDF is encrypted`)
				return { valid: false, error: 'Encrypted PDFs are not supported' }
			}
			
			console.log(`✅ [DocumentUpload] File validation successful for: ${file.name}`)
			return { valid: true }
		} catch (error) {
			console.error(`❌ [DocumentUpload] PDF validation error:`, error)
			return { valid: false, error: 'Failed to validate PDF file' }
		}
	}
	
	function formatFileSize(bytes: number): string {
		if (bytes === 0) return '0 Bytes'
		const k = 1024
		const sizes = ['Bytes', 'KB', 'MB', 'GB']
		const i = Math.floor(Math.log(bytes) / Math.log(k))
		return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
	}
	
	function handleDragOver(event: DragEvent) {
		event.preventDefault()
		isDragOver = true
	}
	
	function handleDragLeave(event: DragEvent) {
		event.preventDefault()
		isDragOver = false
	}
	
	function handleDrop(event: DragEvent) {
		event.preventDefault()
		isDragOver = false
		
		const droppedFiles = Array.from(event.dataTransfer?.files || [])
		handleFiles(droppedFiles)
	}
	
	function handleFileSelect(event: Event) {
		const target = event.target as HTMLInputElement
		const selectedFiles = Array.from(target.files || [])
		handleFiles(selectedFiles)
	}
	
	async function handleFiles(newFiles: File[]) {
		console.log(`📁 [DocumentUpload] Processing ${newFiles.length} files:`, newFiles.map(f => f.name))
		processingStatus = 'Validating files...'
		
		// Validate all files
		console.log(`🔍 [DocumentUpload] Starting validation for ${newFiles.length} files`)
		const validationPromises = newFiles.map(async (file, index) => {
			console.log(`🔍 [DocumentUpload] Validating file ${index + 1}/${newFiles.length}: ${file.name}`)
			const validation = await validateFile(file)
			console.log(`🔍 [DocumentUpload] File ${index + 1} validation result:`, { file: file.name, ...validation })
			return { file, ...validation }
		})
		
		const results = await Promise.all(validationPromises)
		validationResults = results
		console.log(`🔍 [DocumentUpload] All validations complete:`, results)
		
		// Show errors for invalid files
		results.forEach(result => {
			if (!result.valid) {
				console.log(`❌ [DocumentUpload] Invalid file error: ${result.file.name} - ${result.error}`)
				dispatch('error', { message: `${result.file.name}: ${result.error}` })
			}
		})
		
		// Add valid files
		const validFiles = results.filter(r => r.valid).map(r => r.file)
		console.log(`✅ [DocumentUpload] ${validFiles.length} valid files out of ${newFiles.length}:`, validFiles.map(f => f.name))
		
		if (multiple) {
			files = [...files, ...validFiles]
		} else {
			files = validFiles.slice(0, 1)
			if (validFiles.length > 0 && !documentTitle) {
				documentTitle = validFiles[0].name.replace('.pdf', '')
			}
		}
		
		console.log(`📁 [DocumentUpload] Final files array:`, files.map(f => f.name))
		processingStatus = ''
	}
	
	function removeFile(index: number) {
		files = files.filter((_, i) => i !== index)
		if (files.length === 0) {
			documentTitle = ''
		}
	}
	
	function close() {
		files = []
		documentTitle = ''
		uploading = false
		uploadProgress = 0
		validationResults = []
		processingStatus = ''
		dispatch('cancel')
	}
	
	async function handleUpload() {
		if (files.length === 0) {
			console.log(`⚠️ [DocumentUpload] Upload attempted with no files`)
			return
		}
		
		console.log(`🚀 [DocumentUpload] Starting upload process for ${files.length} files`)
		addDebugLog(`Starting upload for ${files.length} files`)
		console.log(`📋 [DocumentUpload] Upload configuration:`, {
			projectId,
			documentTitle,
			autoProcess,
			multiple,
			files: files.map(f => ({ name: f.name, size: f.size }))
		})
		
		uploading = true
		uploadProgress = 0
		
		try {
			const uploadedDocuments: SearchDocument[] = []
			
			// Upload files one by one
			for (let i = 0; i < files.length; i++) {
				const file = files[i]
				const title = multiple ? file.name.replace('.pdf', '') : (documentTitle || file.name.replace('.pdf', ''))
				
				console.log(`📤 [DocumentUpload] Uploading file ${i + 1}/${files.length}: ${file.name}`)
				addDebugLog(`Uploading ${file.name} (${i + 1}/${files.length})`)
				console.log(`📤 [DocumentUpload] Upload parameters:`, { projectId, title, fileName: file.name, fileSize: file.size })
				
				processingStatus = `Uploading ${file.name}...`
				uploadProgress = Math.round((i / files.length) * 70) // Reserve 30% for processing
				
				// Upload to Supabase Storage with timeout
				console.log(`🔄 [DocumentUpload] Calling searchDocumentsService.uploadDocument...`)
				const uploadResult = await Promise.race([
					searchDocumentsService.uploadDocument(projectId, file, title),
					new Promise<never>((_, reject) => 
						setTimeout(() => reject(new Error(`Upload timeout after ${timeout/1000}s`)), timeout)
					)
				])
				console.log(`📤 [DocumentUpload] Upload result for ${file.name}:`, uploadResult)
				
				if (!uploadResult.success) {
					console.error(`❌ [DocumentUpload] Upload failed for ${file.name}:`, uploadResult.error)
					addDebugLog(`❌ Upload failed: ${uploadResult.error}`)
					throw new Error(`Failed to upload ${file.name}: ${uploadResult.error}`)
				}
				
				console.log(`✅ [DocumentUpload] Upload successful for ${file.name}:`, uploadResult.data)
				addDebugLog(`✅ Upload successful for ${file.name}`)
				uploadedDocuments.push(uploadResult.data!)
				
				// If auto-process is enabled, trigger processing
				if (autoProcess) {
					console.log(`⚙️ [DocumentUpload] Starting auto-processing for ${file.name}`)
					processingStatus = `Processing ${file.name}...`
					uploadProgress = Math.round(((i + 0.5) / files.length) * 100)
					
					const processResult = await Promise.race([
						searchDocumentsService.processDocument(uploadResult.data!.id),
						new Promise<never>((_, reject) => 
							setTimeout(() => reject(new Error(`Processing timeout after ${timeout/1000}s`)), timeout)
						)
					])
					console.log(`⚙️ [DocumentUpload] Processing result for ${file.name}:`, processResult)
					
					if (!processResult.success) {
						// Don't fail the entire upload if processing fails
						console.warn(`⚠️ [DocumentUpload] Processing failed for ${file.name}:`, processResult.error)
						dispatch('error', { message: `Upload successful, but processing failed for ${file.name}: ${processResult.error}` })
					} else {
						console.log(`✅ [DocumentUpload] Processing successful for ${file.name}:`, processResult.data)
					}
				}
			}
			
			uploadProgress = 100
			processingStatus = 'Upload complete!'
			console.log(`🎉 [DocumentUpload] All uploads complete. Total documents:`, uploadedDocuments.length)
			
			// Wait a bit to show completion
			await new Promise(resolve => setTimeout(resolve, 500))
			
			console.log(`🎉 [DocumentUpload] Dispatching upload-complete event`)
			dispatch('upload-complete', { documents: uploadedDocuments })
			close()
			
		} catch (error) {
			console.error(`❌ [DocumentUpload] Upload process failed:`, error)
			addDebugLog(`❌ Upload process failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
			dispatch('error', { 
				message: error instanceof Error ? error.message : 'Upload failed. Please try again.' 
			})
			uploading = false
			uploadProgress = 0
			processingStatus = ''
		}
	}
</script>

<div class="bg-white rounded-lg p-6">
	<div class="flex items-center justify-between mb-6">
		<h3 class="text-lg font-semibold text-gray-900">
			Upload Search Document{multiple ? 's' : ''}
		</h3>
		<button 
			on:click={close}
			class="p-2 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100"
		>
			<X size={20} />
		</button>
	</div>
			
			<!-- Upload Area -->
			<div 
				class="border-2 border-dashed rounded-lg p-8 text-center mb-6 transition-colors {isDragOver ? 'border-blue-500 bg-blue-50' : files.length > 0 ? 'border-green-500 bg-green-50' : 'border-gray-300'}"
				on:dragover={handleDragOver}
				on:dragleave={handleDragLeave}
				on:drop={handleDrop}
			>
				{#if files.length === 0}
					<Upload size={48} class="mx-auto text-gray-400 mb-4" />
					<p class="text-gray-600 mb-2">
						Drop your PDF files here, or 
						<label class="text-blue-600 hover:text-blue-800 font-medium cursor-pointer">
							browse files
							<input 
								type="file" 
								class="hidden" 
								accept=".pdf"
								{multiple}
								on:change={handleFileSelect}
							/>
						</label>
					</p>
					<p class="text-xs text-gray-500">
						PDF files up to {formatFileSize(maxFileSize)}
					</p>
				{:else}
					<CheckCircle size={48} class="mx-auto text-green-500 mb-4" />
					<p class="text-green-600 mb-2">
						{files.length} file{files.length > 1 ? 's' : ''} ready for upload
					</p>
					<label class="text-blue-600 hover:text-blue-800 font-medium cursor-pointer">
						Add more files
						<input 
							type="file" 
							class="hidden" 
							accept=".pdf"
							{multiple}
							on:change={handleFileSelect}
						/>
					</label>
				{/if}
			</div>
			
			<!-- File List -->
			{#if files.length > 0}
				<div class="mb-6">
					<h4 class="text-sm font-medium text-gray-700 mb-3">Selected Files</h4>
					<div class="space-y-2 max-h-40 overflow-y-auto">
						{#each files as file, index}
							<div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
								<div class="flex items-center space-x-3">
									<FileText size={20} class="text-red-500" />
									<div>
										<p class="text-sm font-medium text-gray-900">{file.name}</p>
										<p class="text-xs text-gray-500">{formatFileSize(file.size)}</p>
									</div>
								</div>
								<button 
									on:click={() => removeFile(index)}
									class="p-1 text-gray-400 hover:text-red-600"
								>
									<X size={16} />
								</button>
							</div>
						{/each}
					</div>
				</div>
			{/if}
			
			<!-- Document Details -->
			{#if files.length > 0}
				<div class="space-y-4 mb-6">
					<div>
						<label class="block text-sm font-medium text-gray-700 mb-2">
							Document Title {multiple && files.length > 1 ? '(for first document)' : ''}
						</label>
						<input 
							type="text" 
							placeholder="Enter document title..."
							bind:value={documentTitle}
							class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
						/>
					</div>
					
					<div class="flex items-center space-x-2">
						<input 
							type="checkbox" 
							id="autoProcess"
							bind:checked={autoProcess}
							class="rounded"
						/>
						<label for="autoProcess" class="text-sm text-gray-700">
							Automatically process and split documents after upload
						</label>
					</div>
					
					{#if autoProcess}
						<div class="bg-blue-50 border border-blue-200 rounded-lg p-3">
							<div class="flex">
								<AlertCircle size={16} class="text-blue-500 mt-0.5 mr-2 flex-shrink-0" />
								<div class="text-sm text-blue-700">
									<p class="font-medium mb-1">Automatic Processing</p>
									<p>Documents will be analyzed for bookmarks and automatically split into individual survey plans. This may take a few minutes for large documents.</p>
								</div>
							</div>
						</div>
					{/if}
				</div>
			{/if}
			
			<!-- Upload Progress -->
			{#if uploading || processingStatus}
				<div class="mb-6">
					<div class="flex items-center justify-between mb-2">
						<span class="text-sm font-medium text-gray-700">
							{processingStatus || 'Processing...'}
						</span>
						{#if uploading}
							<span class="text-sm text-gray-500">{uploadProgress}%</span>
						{/if}
					</div>
					{#if uploading}
						<div class="w-full bg-gray-200 rounded-full h-2">
							<div 
								class="bg-blue-600 h-2 rounded-full transition-all duration-300"
								style="width: {uploadProgress}%"
							></div>
						</div>
					{/if}
				</div>
			{/if}
			
			<!-- Debug Panel -->
			{#if debugMode || uploading}
				<div class="mb-6">
					<div class="flex items-center justify-between mb-2">
						<h4 class="text-sm font-medium text-gray-700">Debug Info</h4>
						<button 
							on:click={() => debugMode = !debugMode}
							class="text-xs text-blue-600 hover:text-blue-800"
						>
							{debugMode ? 'Hide' : 'Show'} Debug
						</button>
					</div>
					{#if debugMode || uploading}
						<div class="bg-gray-900 text-green-400 p-3 rounded-lg text-xs font-mono max-h-40 overflow-y-auto">
							{#each debugLogs as log}
								<div>{log}</div>
							{/each}
							{#if debugLogs.length === 0}
								<div class="text-gray-500">No debug logs yet...</div>
							{/if}
						</div>
					{/if}
				</div>
			{/if}
			
			<!-- Actions -->
			<div class="flex justify-between items-center">
				<button 
					on:click={() => debugMode = !debugMode}
					class="px-3 py-1 text-xs text-gray-600 bg-gray-100 rounded hover:bg-gray-200"
					type="button"
				>
					Debug
				</button>
				<div class="space-x-3">
					<button 
						on:click={close}
						class="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
						disabled={uploading}
					>
						Cancel
					</button>
					<button 
						on:click={handleUpload}
						class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
						disabled={files.length === 0 || uploading || !documentTitle.trim()}
					>
						{uploading ? 'Uploading...' : `Upload ${files.length} File${files.length > 1 ? 's' : ''}`}
					</button>
				</div>
			</div>
		</div>