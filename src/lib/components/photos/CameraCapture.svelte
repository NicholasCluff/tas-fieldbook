<script lang="ts">
	import { onMount, onDestroy } from 'svelte'
	import { 
		Camera, 
		SwitchCamera, 
		Zap, 
		ZapOff, 
		Grid3x3, 
		Loader2, 
		AlertCircle 
	} from 'lucide-svelte'
	
	interface Props {
		onCapture: (blob: Blob) => void
		onError?: (error: string) => void
		className?: string
	}
	
	let {
		onCapture,
		onError,
		className = ''
	}: Props = $props()
	
	let videoElement: HTMLVideoElement
	let canvasElement: HTMLCanvasElement
	let mediaStream: MediaStream | null = null
	
	// Camera states
	let cameraActive = false
	let cameraLoading = false
	let cameraError: string | null = null
	let facingMode = 'environment' // 'user' for front camera, 'environment' for back camera
	let flashMode = 'off'
	let showGrid = false
	let hasFlash = false
	let availableCameras: MediaDeviceInfo[] = []
	
	onMount(() => {
		initCamera()
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
				await videoElement.play()
			}
			
			// Check if device has flash
			const track = mediaStream.getVideoTracks()[0]
			const capabilities = track.getCapabilities()
			hasFlash = capabilities.torch !== undefined
			
			cameraActive = true
		} catch (error) {
			cameraError = 'Camera access denied or not available. Please check permissions.'
			if (onError) {
				onError(cameraError)
			}
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
				onCapture(blob)
			}
		}, 'image/jpeg', 0.9)
	}
	
	export function retryCamera() {
		initCamera()
	}
</script>

<div class="relative {className}">
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
	{:else}
		<!-- Live Camera -->
		<video 
			bind:this={videoElement}
			autoplay 
			muted 
			playsinline
			class="w-full h-full object-cover"
			style="transform: scaleX(-1);"
		></video>
		
		<!-- Camera Controls Overlay -->
		<div class="absolute top-4 right-4 flex items-center space-x-2">
			<!-- Flash Toggle -->
			{#if hasFlash}
				<button 
					on:click={toggleFlash}
					class="p-2 bg-black bg-opacity-50 text-white rounded-full hover:bg-opacity-75 transition-colors"
					title="Toggle flash"
				>
					{#if flashMode === 'on'}
						<Zap class="w-5 h-5" />
					{:else}
						<ZapOff class="w-5 h-5" />
					{/if}
				</button>
			{/if}
			
			<!-- Grid Toggle -->
			<button 
				on:click={() => showGrid = !showGrid}
				class="p-2 bg-black bg-opacity-50 text-white rounded-full hover:bg-opacity-75 transition-colors {showGrid ? 'bg-opacity-75' : ''}"
				title="Toggle grid"
			>
				<Grid3x3 class="w-5 h-5" />
			</button>
			
			<!-- Camera Switch -->
			{#if availableCameras.length > 1}
				<button 
					on:click={switchCamera}
					class="p-2 bg-black bg-opacity-50 text-white rounded-full hover:bg-opacity-75 transition-colors"
					title="Switch camera"
				>
					<SwitchCamera class="w-5 h-5" />
				</button>
			{/if}
		</div>
		
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
		
		<!-- Capture Button -->
		<div class="absolute bottom-6 left-1/2 transform -translate-x-1/2">
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
	{/if}
	
	<!-- Hidden canvas for photo capture -->
	<canvas bind:this={canvasElement} class="hidden"></canvas>
</div>