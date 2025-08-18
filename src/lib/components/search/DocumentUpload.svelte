<script lang="ts">
	import { createEventDispatcher } from 'svelte'
	import { Upload, X, FileText, AlertCircle, CheckCircle } from 'lucide-svelte'
	import { searchDocumentsService } from '$lib/services/searchDocuments.service.js'
	import { pdfProcessingService } from '$lib/services/pdfProcessing.service.js'
	import DocumentAnalysisModal from './DocumentAnalysisModal.svelte'
	import type { SearchDocument } from '$lib/types/database.js'
	import type { ExtractedPlan, PDFMetadata } from '$lib/types/pdf.js'
	
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
	let currentStage: 'analyzing' | 'extracting' | 'splitting' | 'uploading' | 'complete' = 'analyzing'
	let detectedPlans: any[] = []
	let currentPlan = ''
	
	// Modal state
	let showAnalysisModal = false
	let currentFile: File | null = null
	let currentMetadata: PDFMetadata | null = null
	let currentExtractedPlans: ExtractedPlan[] = []
	let analysisProgress: { stage: string, progress: number, message: string } | null = null
	
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
			// console.log(`❌ [DocumentUpload] File type validation failed: ${file.type}`)
			return { valid: false, error: 'Only PDF files are allowed' }
		}
		if (file.size > maxFileSize) {
			// console.log(`❌ [DocumentUpload] File size validation failed: ${file.size} > ${maxFileSize}`)
			return { valid: false, error: `File size must be less than ${formatFileSize(maxFileSize)}` }
		}
		
		// Validate PDF structure
		try {
			// console.log(`🔍 [DocumentUpload] Starting PDF structure validation for: ${file.name}`)
			const validationResult = await pdfProcessingService.validatePDF(file)
			// console.log(`🔍 [DocumentUpload] PDF validation result:`, validationResult)
			
			if (!validationResult.success) {
				// console.log(`❌ [DocumentUpload] PDF validation service failed: ${validationResult.error}`)
				return { valid: false, error: `PDF validation failed: ${validationResult.error}` }
			}
			
			if (!validationResult.data?.isValid) {
				const errors = validationResult.data?.errors?.join(', ') || 'Unknown PDF error'
				// console.log(`❌ [DocumentUpload] PDF structure invalid:`, errors)
				return { valid: false, error: `Invalid PDF: ${errors}` }
			}
			
			if (validationResult.data?.encrypted) {
				// console.log(`❌ [DocumentUpload] PDF is encrypted`)
				return { valid: false, error: 'Encrypted PDFs are not supported' }
			}
			
			// console.log(`✅ [DocumentUpload] File validation successful for: ${file.name}`)
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
		// console.log(`📁 [DocumentUpload] Processing ${newFiles.length} files:`, newFiles.map(f => f.name))
		processingStatus = 'Validating files...'
		
		// Validate all files
		// console.log(`🔍 [DocumentUpload] Starting validation for ${newFiles.length} files`)
		const validationPromises = newFiles.map(async (file, index) => {
			// console.log(`🔍 [DocumentUpload] Validating file ${index + 1}/${newFiles.length}: ${file.name}`)
			const validation = await validateFile(file)
			// console.log(`🔍 [DocumentUpload] File ${index + 1} validation result:`, { file: file.name, ...validation })
			return { file, ...validation }
		})
		
		const results = await Promise.all(validationPromises)
		validationResults = results
		// console.log(`🔍 [DocumentUpload] All validations complete:`, results)
		
		// Show errors for invalid files
		results.forEach(result => {
			if (!result.valid) {
				// console.log(`❌ [DocumentUpload] Invalid file error: ${result.file.name} - ${result.error}`)
				dispatch('error', { message: `${result.file.name}: ${result.error}` })
			}
		})
		
		// Add valid files
		const validFiles = results.filter(r => r.valid).map(r => r.file)
		// console.log(`✅ [DocumentUpload] ${validFiles.length} valid files out of ${newFiles.length}:`, validFiles.map(f => f.name))
		
		if (multiple) {
			files = [...files, ...validFiles]
		} else {
			files = validFiles.slice(0, 1)
			if (validFiles.length > 0 && !documentTitle) {
				documentTitle = validFiles[0].name.replace('.pdf', '')
			}
		}
		
		// console.log(`📁 [DocumentUpload] Final files array:`, files.map(f => f.name))
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
	
	// Start analysis - opens the modal for the first file
	async function startAnalysis() {
		if (files.length === 0) {
			// console.log(`⚠️ [DocumentUpload] Analysis attempted with no files`)
			return
		}
		
		// For now, handle single file (can be extended for multiple files)
		currentFile = files[0]
		showAnalysisModal = true
		analysisProgress = { stage: 'analyzing', progress: 0, message: 'Starting analysis...' }
		
		// console.log(`🔍 [DocumentUpload] Starting analysis for: ${currentFile.name}`)
		addDebugLog(`Starting analysis for: ${currentFile.name}`)
		
		try {
			// Progress callback for analysis
			const progressCallback = (progress: any) => {
				analysisProgress = {
					stage: progress.stage,
					progress: progress.progress,
					message: progress.message
				}
				
				// Update detected plans for modal
				if (progress.stage === 'extracting' && progress.plans) {
					currentExtractedPlans = progress.plans.map((p: any) => ({
						referenceNumber: p.referenceNumber,
						title: p.referenceNumber,
						startPage: 1, // Will be filled in by the processing
						endPage: p.pageCount || 1,
						pageCount: p.pageCount || 1
					}))
				}
				
				addDebugLog(`Analysis: ${progress.stage} - ${progress.message}`)
			}
			
			// Run client-side analysis without upload
			const analysisResult = await pdfProcessingService.processDocumentClientSide(
				currentFile,
				progressCallback
			)
			
			if (!analysisResult.success) {
				console.error(`❌ [DocumentUpload] Analysis failed:`, analysisResult.error)
				addDebugLog(`❌ Analysis failed: ${analysisResult.error}`)
				analysisProgress = { stage: 'complete', progress: 100, message: 'Analysis failed' }
				return
			}
			
			const { plans, metadata } = analysisResult.data!
			currentMetadata = metadata
			currentExtractedPlans = plans
			analysisProgress = { stage: 'complete', progress: 100, message: 'Analysis complete' }
			
			// console.log(`✅ [DocumentUpload] Analysis complete:`, { plans: plans.length, metadata })
			addDebugLog(`✅ Analysis complete: ${plans.length} plans detected`)
			
		} catch (error) {
			console.error(`❌ [DocumentUpload] Analysis failed:`, error)
			addDebugLog(`❌ Analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
			analysisProgress = { stage: 'complete', progress: 100, message: 'Analysis failed' }
		}
	}
	
	// Handle final upload from modal
	async function handleFinalUpload(plans: ExtractedPlan[]) {
		if (!currentFile || !currentMetadata) {
			console.error(`❌ [DocumentUpload] No file or metadata available for upload`)
			return
		}
		
		// console.log(`🚀 [DocumentUpload] Starting final upload with ${plans.length} plans`)
		addDebugLog(`Starting final upload with ${plans.length} plans`)
		
		uploading = true
		uploadProgress = 0
		showAnalysisModal = false
		
		try {
			const title = documentTitle || currentFile.name.replace('.pdf', '')
			
			// Progress callback for upload
			const progressCallback = (progress: any) => {
				currentStage = progress.stage
				uploadProgress = progress.progress
				processingStatus = progress.message
				currentPlan = progress.currentPlan || ''
				addDebugLog(`Upload: ${progress.stage} - ${progress.message}`)
			}
			
			// Split and upload using the edited plans
			const splitResult = await pdfProcessingService.splitAndUploadPlans(
				currentFile,
				plans,
				projectId,
				progressCallback
			)
			
			if (!splitResult.success) {
				console.error(`❌ [DocumentUpload] Upload failed:`, splitResult.error)
				addDebugLog(`❌ Upload failed: ${splitResult.error}`)
				throw new Error(`Upload failed: ${splitResult.error}`)
			}
			
			// Create document record in database
			// console.log(`💾 [DocumentUpload] Creating document record`)
			const documentRecord = await searchDocumentsService.createDocumentRecord(
				projectId,
				title,
				currentFile.name,
				plans,
				splitResult.data!,
				currentMetadata
			)
			
			if (!documentRecord.success) {
				console.error(`❌ [DocumentUpload] Failed to create document record:`, documentRecord.error)
				addDebugLog(`❌ Database record failed: ${documentRecord.error}`)
				throw new Error(`Failed to save document record: ${documentRecord.error}`)
			}
			
			uploadProgress = 100
			currentStage = 'complete'
			processingStatus = 'Upload complete!'
			// console.log(`✅ [DocumentUpload] Upload successful`)
			addDebugLog(`✅ Upload complete`)
			
			// Wait a bit to show completion
			await new Promise(resolve => setTimeout(resolve, 1000))
			
			dispatch('upload-complete', { documents: [documentRecord.data!] })
			close()
			
		} catch (error) {
			console.error(`❌ [DocumentUpload] Upload failed:`, error)
			addDebugLog(`❌ Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
			dispatch('error', { 
				message: error instanceof Error ? error.message : 'Upload failed. Please try again.' 
			})
			uploading = false
			uploadProgress = 0
			processingStatus = ''
			currentStage = 'analyzing'
		}
	}

	// Modal event handlers
	function handleModalProceed(event: { plans: ExtractedPlan[] }) {
		handleFinalUpload(event.plans)
	}

	function handleModalCancel() {
		showAnalysisModal = false
		currentFile = null
		currentMetadata = null
		currentExtractedPlans = []
		analysisProgress = null
	}

	function handleModalRetry() {
		// Reset and restart analysis
		currentExtractedPlans = []
		analysisProgress = null
		startAnalysis()
	}

	function handlePlansChange(plans: ExtractedPlan[]) {
		currentExtractedPlans = plans
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
			
			<!-- Processing Progress -->
			{#if uploading || processingStatus}
				<div class="mb-6">
					<div class="flex items-center justify-between mb-2">
						<div class="flex items-center space-x-2">
							<span class="text-sm font-medium text-gray-700">
								{processingStatus || 'Processing...'}
							</span>
							{#if currentPlan}
								<span class="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
									{currentPlan}
								</span>
							{/if}
						</div>
						{#if uploading}
							<span class="text-sm text-gray-500">{uploadProgress}%</span>
						{/if}
					</div>
					
					<!-- Progress Bar -->
					{#if uploading}
						<div class="w-full bg-gray-200 rounded-full h-2 mb-3">
							<div 
								class="h-2 rounded-full transition-all duration-300 {
									currentStage === 'complete' ? 'bg-green-600' : 
									currentStage === 'uploading' ? 'bg-blue-600' :
									currentStage === 'splitting' ? 'bg-orange-600' :
									currentStage === 'extracting' ? 'bg-purple-600' : 'bg-blue-400'
								}"
								style="width: {uploadProgress}%"
							></div>
						</div>
						
						<!-- Stage Indicators -->
						<div class="flex justify-between text-xs text-gray-500 mb-3">
							<div class="flex items-center space-x-1">
								<div class="w-2 h-2 rounded-full {currentStage === 'analyzing' || uploadProgress > 0 ? 'bg-blue-500' : 'bg-gray-300'}"></div>
								<span>Analyzing</span>
							</div>
							<div class="flex items-center space-x-1">
								<div class="w-2 h-2 rounded-full {currentStage === 'extracting' || uploadProgress > 30 ? 'bg-purple-500' : 'bg-gray-300'}"></div>
								<span>Extracting</span>
							</div>
							<div class="flex items-center space-x-1">
								<div class="w-2 h-2 rounded-full {currentStage === 'splitting' || uploadProgress > 60 ? 'bg-orange-500' : 'bg-gray-300'}"></div>
								<span>Splitting</span>
							</div>
							<div class="flex items-center space-x-1">
								<div class="w-2 h-2 rounded-full {currentStage === 'uploading' || uploadProgress > 80 ? 'bg-blue-500' : 'bg-gray-300'}"></div>
								<span>Uploading</span>
							</div>
							<div class="flex items-center space-x-1">
								<div class="w-2 h-2 rounded-full {currentStage === 'complete' ? 'bg-green-500' : 'bg-gray-300'}"></div>
								<span>Complete</span>
							</div>
						</div>
					{/if}
					
					<!-- Detected Plans Preview -->
					{#if detectedPlans.length > 0}
						<div class="bg-green-50 border border-green-200 rounded-lg p-3">
							<div class="flex items-center mb-2">
								<CheckCircle size={16} class="text-green-500 mr-2" />
								<span class="text-sm font-medium text-green-700">
									{detectedPlans.length} Plans Detected
								</span>
							</div>
							<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-xs">
								{#each detectedPlans as plan}
									<div class="bg-white px-2 py-1 rounded border text-green-700">
										{plan.referenceNumber} ({plan.pageCount} pages)
									</div>
								{/each}
							</div>
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
						on:click={startAnalysis}
						class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
						disabled={files.length === 0 || uploading || !documentTitle.trim()}
					>
						{uploading ? 'Uploading...' : 'Analyze Document'}
					</button>
				</div>
			</div>
		</div>

<!-- Analysis Modal -->
<DocumentAnalysisModal 
	open={showAnalysisModal}
	fileName={currentFile?.name || ''}
	metadata={currentMetadata || { pageCount: 0, fileSize: 0 }}
	detectedPlans={currentExtractedPlans}
	analysisProgress={analysisProgress}
	onproceed={handleModalProceed}
	oncancel={handleModalCancel}
	onretry={handleModalRetry}
	onplanschange={handlePlansChange}
/>