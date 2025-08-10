<script lang="ts">
	import { page } from '$app/stores'
	import { onMount, onDestroy } from 'svelte'
	import { 
		Camera, 
		SwitchCamera, 
		X, 
		Check, 
		RotateCcw, 
		MapPin, 
		Loader2,
		AlertCircle,
		Zap,
		ZapOff,
		Grid3x3
	} from 'lucide-svelte'
	
	const projectId = $derived($page.params.id)
	
	let videoElement: HTMLVideoElement
	let canvasElement: HTMLCanvasElement
	let mediaStream: MediaStream | null = null
	let photoBlob: Blob | null = null
	let capturedImageUrl: string | null = null
	
	// Camera states
	let cameraActive = false
	let cameraLoading = false
	let cameraError: string | null = null
	let facingMode = 'environment' // 'user' for front camera, 'environment' for back camera
	let flashMode = 'off'
	let showGrid = false
	let hasFlash = false
	let availableCameras: MediaDeviceInfo[] = []
	
	// Photo states
	let photoTaken = false
	let saving = false
	let saveError: string | null = null
	
	// Location states
	let locationLoading = false
	let location: { lat: number; lng: number; accuracy: number } | null = null
	let locationError: string | null = null
	
	// Form states
	let title = ''
	let description = ''
	
	onMount(() => {
		initCamera()
		getCurrentLocation()
		getAvailableCameras()
	})
	
	onDestroy(() => {
		stopCamera()
	})
	
	async function getAvailableCameras() {
		try {
			const devices = await navigator.mediaDevices.enumerateDevices()
			availableCameras = devices.filter(device => device.kind === 'videoinput')
		} catch (error) {
			// Error getting available cameras
		}
	}
	
	async function initCamera() {
		cameraLoading = true
		cameraError = null
		
		try {
			const constraints = {
				video: {
					facingMode: facingMode,
					width: { ideal: 1920 },
					height: { ideal: 1080 }
				}
			}
			
			mediaStream = await navigator.mediaDevices.getUserMedia(constraints)
			
			if (videoElement) {
				videoElement.srcObject = mediaStream
				videoElement.play()
			}
			
			// Check if device has flash
			const track = mediaStream.getVideoTracks()[0]
			const capabilities = track.getCapabilities()
			hasFlash = capabilities.torch !== undefined
			
			cameraActive = true
		} catch (error) {
			cameraError = 'Camera access denied or not available. Please check permissions.'
		} finally {
			cameraLoading = false
		}
	}
	
	function stopCamera() {
		if (mediaStream) {
			mediaStream.getTracks().forEach(track => track.stop())
			mediaStream = null
		}
		cameraActive = false
	}
	
	async function switchCamera() {
		if (availableCameras.length <= 1) return
		
		facingMode = facingMode === 'environment' ? 'user' : 'environment'
		stopCamera()
		await initCamera()
	}
	
	async function toggleFlash() {
		if (!hasFlash || !mediaStream) return
		
		const track = mediaStream.getVideoTracks()[0]
		const newFlashMode = flashMode === 'off' ? 'on' : 'off'
		
		try {
			await track.applyConstraints({
				advanced: [{ torch: newFlashMode === 'on' }]
			})
			flashMode = newFlashMode
		} catch (error) {
			// Error toggling flash
		}
	}
	
	function capturePhoto() {
		if (!videoElement || !canvasElement) return
		
		const context = canvasElement.getContext('2d')
		if (!context) return
		
		// Set canvas size to match video
		canvasElement.width = videoElement.videoWidth
		canvasElement.height = videoElement.videoHeight
		
		// Draw video frame to canvas
		context.drawImage(videoElement, 0, 0)
		
		// Convert to blob
		canvasElement.toBlob((blob) => {
			if (blob) {
				photoBlob = blob
				capturedImageUrl = URL.createObjectURL(blob)
				photoTaken = true
				stopCamera()
			}
		}, 'image/jpeg', 0.9)
	}
	
	function retakePhoto() {
		if (capturedImageUrl) {
			URL.revokeObjectURL(capturedImageUrl)
			capturedImageUrl = null
		}
		photoBlob = null
		photoTaken = false
		saveError = null
		initCamera()
	}
	
	async function getCurrentLocation() {
		if (!navigator.geolocation) {
			locationError = 'Geolocation not supported'
			return
		}
		
		locationLoading = true
		locationError = null
		
		try {
			const position = await new Promise<GeolocationPosition>((resolve, reject) => {
				navigator.geolocation.getCurrentPosition(resolve, reject, {
					enableHighAccuracy: true,
					timeout: 10000,
					maximumAge: 300000
				})
			})
			
			location = {
				lat: position.coords.latitude,
				lng: position.coords.longitude,
				accuracy: position.coords.accuracy
			}
		} catch (error) {
			locationError = 'Location access denied or unavailable'
		} finally {
			locationLoading = false
		}
	}
	
	async function savePhoto() {
		if (!photoBlob) return
		
		saving = true
		saveError = null
		
		try {
			// TODO: Implement actual photo save logic
			// 1. Upload to Supabase Storage
			// 2. Save photo record to database
			// 3. Extract EXIF metadata
			// 4. Handle offline storage if needed
			
			await new Promise(resolve => setTimeout(resolve, 2000)) // Mock delay
			
			// Mock success - redirect to photos page
			window.location.href = `/projects/${projectId}/photos`
		} catch (error) {
			saveError = 'Failed to save photo. Please try again.'
		} finally {
			saving = false
		}
	}
	
	function formatAccuracy(accuracy: number): string {
		if (accuracy < 10) return 'High accuracy'
		if (accuracy < 50) return 'Good accuracy'
		if (accuracy < 100) return 'Fair accuracy'
		return 'Low accuracy'
	}
</script>

<div class="flex flex-col h-full bg-black">
	<!-- Header -->
	<div class="bg-black bg-opacity-50 text-white p-4 flex items-center justify-between relative z-10">
		<div class="flex items-center space-x-3">
			<a 
				href="/projects/{projectId}/photos"
				class="p-2 hover:bg-white hover:bg-opacity-20 rounded-full transition-colors"
			>
				<X class="w-6 h-6" />
			</a>
			<h1 class="text-lg font-medium">Take Photo</h1>
		</div>
		
		{#if !photoTaken}
			<div class="flex items-center space-x-2">
				<!-- Flash Toggle -->
				{#if hasFlash}
					<button 
						on:click={toggleFlash}
						class="p-2 hover:bg-white hover:bg-opacity-20 rounded-full transition-colors"
						title="Toggle flash"
					>
						{#if flashMode === 'on'}
							<Zap class="w-6 h-6" />
						{:else}
							<ZapOff class="w-6 h-6" />
						{/if}
					</button>
				{/if}
				
				<!-- Grid Toggle -->
				<button 
					on:click={() => showGrid = !showGrid}
					class="p-2 hover:bg-white hover:bg-opacity-20 rounded-full transition-colors {showGrid ? 'bg-white bg-opacity-20' : ''}"
					title="Toggle grid"
				>
					<Grid3x3 class="w-6 h-6" />
				</button>
				
				<!-- Camera Switch -->
				{#if availableCameras.length > 1}
					<button 
						on:click={switchCamera}
						class="p-2 hover:bg-white hover:bg-opacity-20 rounded-full transition-colors"
						title="Switch camera"
					>
						<SwitchCamera class="w-6 h-6" />
					</button>
				{/if}
			</div>
		{/if}
	</div>
	
	<!-- Camera/Photo Area -->
	<div class="flex-1 relative">
		{#if cameraLoading}
			<div class="absolute inset-0 flex items-center justify-center bg-black">
				<div class="text-center text-white">
					<Loader2 class="w-12 h-12 animate-spin mx-auto mb-4" />
					<p>Starting camera...</p>
				</div>
			</div>
		{:else if cameraError}
			<div class="absolute inset-0 flex items-center justify-center bg-black">
				<div class="text-center text-white max-w-md mx-auto px-4">
					<AlertCircle class="w-16 h-16 mx-auto mb-4 text-red-400" />
					<h3 class="text-lg font-medium mb-2">Camera Error</h3>
					<p class="text-gray-300 mb-6">{cameraError}</p>
					<button 
						on:click={initCamera}
						class="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg font-medium"
					>
						Try Again
					</button>
				</div>
			</div>
		{:else if photoTaken && capturedImageUrl}
			<!-- Photo Preview -->
			<div class="absolute inset-0">
				<img 
					src={capturedImageUrl} 
					alt="Captured photo" 
					class="w-full h-full object-cover"
				/>
			</div>
		{:else}
			<!-- Live Camera -->
			<video 
				bind:this={videoElement}
				autoplay 
				muted 
				playsinline
				class="w-full h-full object-cover"
			></video>
			
			<!-- Camera Grid Overlay -->
			{#if showGrid}
				<div class="absolute inset-0 pointer-events-none">
					<div class="w-full h-full grid grid-cols-3 grid-rows-3">
						{#each Array(9) as _}
							<div class="border border-white border-opacity-30"></div>
						{/each}
					</div>
				</div>
			{/if}
		{/if}
		
		<!-- Hidden canvas for photo capture -->
		<canvas bind:this={canvasElement} class="hidden"></canvas>
	</div>
	
	<!-- Location Status -->
	{#if !photoTaken}
		<div class="absolute bottom-32 left-4 right-4 z-10">
			<div class="bg-black bg-opacity-50 text-white px-3 py-2 rounded-lg text-sm">
				{#if locationLoading}
					<div class="flex items-center space-x-2">
						<Loader2 class="w-4 h-4 animate-spin" />
						<span>Getting location...</span>
					</div>
				{:else if location}
					<div class="flex items-center space-x-2">
						<MapPin class="w-4 h-4 text-green-400" />
						<span>Location: {formatAccuracy(location.accuracy)}</span>
					</div>
				{:else if locationError}
					<div class="flex items-center space-x-2">
						<AlertCircle class="w-4 h-4 text-red-400" />
						<span>No location</span>
					</div>
				{/if}
			</div>
		</div>
	{/if}
	
	<!-- Controls -->
	<div class="p-6 bg-black bg-opacity-50">
		{#if !photoTaken}
			<!-- Camera Controls -->
			<div class="flex items-center justify-center">
				<button 
					on:click={capturePhoto}
					disabled={!cameraActive}
					class="w-20 h-20 bg-white rounded-full flex items-center justify-center hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
				>
					<div class="w-16 h-16 bg-white border-4 border-gray-300 rounded-full flex items-center justify-center">
						<Camera class="w-8 h-8 text-gray-600" />
					</div>
				</button>
			</div>
		{:else}
			<!-- Photo Actions -->
			<div class="space-y-4">
				<!-- Photo Metadata Form -->
				<div class="bg-white bg-opacity-10 rounded-lg p-4 space-y-3">
					<div>
						<label class="block text-sm font-medium text-white mb-1">Title</label>
						<input 
							bind:value={title}
							type="text" 
							placeholder="Enter photo title..."
							class="w-full px-3 py-2 bg-white bg-opacity-20 text-white placeholder-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
						/>
					</div>
					
					<div>
						<label class="block text-sm font-medium text-white mb-1">Description</label>
						<textarea 
							bind:value={description}
							placeholder="Add a description..."
							rows="2"
							class="w-full px-3 py-2 bg-white bg-opacity-20 text-white placeholder-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
						></textarea>
					</div>
					
					<!-- Location Status -->
					{#if location}
						<div class="flex items-center space-x-2 text-sm text-green-300">
							<MapPin class="w-4 h-4" />
							<span>Location captured ({formatAccuracy(location.accuracy)})</span>
						</div>
					{:else}
						<div class="flex items-center space-x-2 text-sm text-yellow-300">
							<AlertCircle class="w-4 h-4" />
							<span>No location data</span>
						</div>
					{/if}
				</div>
				
				{#if saveError}
					<div class="bg-red-500 bg-opacity-20 border border-red-500 text-red-100 px-4 py-3 rounded-lg">
						<div class="flex items-center space-x-2">
							<AlertCircle class="w-5 h-5" />
							<span>{saveError}</span>
						</div>
					</div>
				{/if}
				
				<!-- Action Buttons -->
				<div class="flex items-center space-x-3">
					<button 
						on:click={retakePhoto}
						disabled={saving}
						class="flex-1 bg-gray-600 hover:bg-gray-700 disabled:opacity-50 text-white px-4 py-3 rounded-lg font-medium flex items-center justify-center space-x-2"
					>
						<RotateCcw class="w-5 h-5" />
						<span>Retake</span>
					</button>
					
					<button 
						on:click={savePhoto}
						disabled={saving}
						class="flex-1 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white px-4 py-3 rounded-lg font-medium flex items-center justify-center space-x-2"
					>
						{#if saving}
							<Loader2 class="w-5 h-5 animate-spin" />
							<span>Saving...</span>
						{:else}
							<Check class="w-5 h-5" />
							<span>Save Photo</span>
						{/if}
					</button>
				</div>
			</div>
		{/if}
	</div>
</div>

<style>
	video {
		transform: scaleX(-1);
	}
</style>