<script lang="ts">
  import { onMount, onDestroy } from 'svelte'
  import * as pdfjsLib from 'pdfjs-dist'
  
  interface Props {
    src: string
    width?: number
    height?: number
    zoom?: number
    rotation?: number
  }

  let { 
    src, 
    width = 595, 
    height = 842,
    zoom = 100,
    rotation = 0
  }: Props = $props()

  let containerRef: HTMLDivElement | undefined
  let canvasRef: HTMLCanvasElement | undefined
  let loading = $state(true)
  let error = $state('')
  let currentPage = $state(1)
  let totalPages = $state(0)
  let pdfDoc: any = null
  let renderTask: any = null

  // Set PDF.js worker source
  pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdfjs/pdf.worker.min.mjs'

  onMount(() => {
    if (src) {
      loadPdf()
    }
  })

  onDestroy(() => {
    if (renderTask) {
      renderTask.cancel()
    }
    if (pdfDoc) {
      pdfDoc.destroy()
    }
  })

  async function loadPdf() {
    try {
      loading = true
      error = ''
      // console.log('[SimplePdfViewer] Loading PDF from:', src)

      // Fetch PDF data as blob to handle authentication
      const response = await fetch(src)
      if (!response.ok) {
        throw new Error(`Failed to fetch PDF: ${response.status} ${response.statusText}`)
      }

      const pdfArrayBuffer = await response.arrayBuffer()
      // console.log('[SimplePdfViewer] PDF data loaded, size:', pdfArrayBuffer.byteLength)

      // Load PDF document
      pdfDoc = await pdfjsLib.getDocument({ data: pdfArrayBuffer }).promise
      totalPages = pdfDoc.numPages
      // console.log('[SimplePdfViewer] PDF loaded successfully, pages:', totalPages)

      // Render first page
      await renderPage(currentPage)
      loading = false
    } catch (err) {
      console.error('[SimplePdfViewer] PDF loading error:', err)
      error = err instanceof Error ? err.message : 'Failed to load PDF'
      loading = false
    }
  }

  async function renderPage(pageNumber: number) {
    if (!pdfDoc || !canvasRef) {
      // console.log('[SimplePdfViewer] Cannot render - missing pdfDoc or canvas:', { pdfDoc: !!pdfDoc, canvasRef: !!canvasRef })
      return
    }

    try {
      // console.log('[SimplePdfViewer] Rendering page:', pageNumber, 'of', totalPages)
      
      // Cancel any ongoing render task
      if (renderTask) {
        renderTask.cancel()
      }

      const page = await pdfDoc.getPage(pageNumber)
      const canvas = canvasRef
      const context = canvas.getContext('2d')

      // Clear canvas first
      context.clearRect(0, 0, canvas.width, canvas.height)

      // Calculate scale based on desired width and zoom
      const viewport = page.getViewport({ scale: 1 })
      const scale = (width * (zoom / 100)) / viewport.width
      const scaledViewport = page.getViewport({ scale, rotation })

      // Set canvas dimensions
      canvas.width = scaledViewport.width
      canvas.height = scaledViewport.height
      canvas.style.width = `${scaledViewport.width}px`
      canvas.style.height = `${scaledViewport.height}px`

      // Render the page
      const renderContext = {
        canvasContext: context,
        viewport: scaledViewport
      }

      renderTask = page.render(renderContext)
      await renderTask.promise
      // console.log('[SimplePdfViewer] Page', pageNumber, 'rendered successfully')
    } catch (err) {
      if (err?.name !== 'RenderingCancelledException') {
        console.error('[SimplePdfViewer] Page rendering error:', err)
        error = 'Failed to render PDF page'
      }
    }
  }

  // Re-render when zoom, rotation, or page changes
  $effect(() => {
    if (pdfDoc && canvasRef && !loading && currentPage) {
      renderPage(currentPage)
    }
  })

  // Re-load PDF when src changes
  $effect(() => {
    if (src) {
      loadPdf()
    }
  })

  function handleCanvasError() {
    error = 'Canvas rendering failed'
    loading = false
  }

  function goToNextPage() {
    if (currentPage < totalPages) {
      currentPage += 1
      if (pdfDoc && canvasRef) {
        renderPage(currentPage)
      }
    }
  }

  function goToPreviousPage() {
    if (currentPage > 1) {
      currentPage -= 1
      if (pdfDoc && canvasRef) {
        renderPage(currentPage)
      }
    }
  }

  function goToPage(pageNum: number) {
    if (pageNum >= 1 && pageNum <= totalPages && pageNum !== currentPage) {
      currentPage = pageNum
      if (pdfDoc && canvasRef) {
        renderPage(currentPage)
      }
    }
  }

  function handleKeyDown(event: KeyboardEvent) {
    switch (event.key) {
      case 'ArrowLeft':
      case 'ArrowUp':
      case 'PageUp':
        event.preventDefault()
        goToPreviousPage()
        break
      case 'ArrowRight':
      case 'ArrowDown':
      case 'PageDown':
        event.preventDefault()
        goToNextPage()
        break
      case 'Home':
        event.preventDefault()
        goToPage(1)
        break
      case 'End':
        event.preventDefault()
        goToPage(totalPages)
        break
    }
  }
</script>

<div 
  bind:this={containerRef}
  class="relative bg-white shadow-lg flex items-center justify-center overflow-hidden focus:outline-none focus:ring-2 focus:ring-blue-500"
  style="width: {width}px; height: {height}px;"
  tabindex="0"
  on:keydown={handleKeyDown}
>
  {#if loading}
    <div class="absolute inset-0 flex items-center justify-center bg-gray-100">
      <div class="text-center">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
        <div class="text-gray-500 text-sm">Loading PDF...</div>
      </div>
    </div>
  {/if}
  
  {#if error}
    <div class="absolute inset-0 flex items-center justify-center bg-gray-100">
      <div class="text-center">
        <div class="text-red-500 mb-2">Failed to load PDF</div>
        <div class="text-sm text-gray-500 mb-3">{error}</div>
        <div class="space-x-2">
          <button 
            class="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
            on:click={() => window.open(src, '_blank')}
          >
            Open in New Tab
          </button>
          <button 
            class="px-3 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 text-sm"
            on:click={loadPdf}
          >
            Retry
          </button>
        </div>
      </div>
    </div>
  {:else if !loading}
    <canvas
      bind:this={canvasRef}
      class="max-w-full max-h-full cursor-grab"
      on:error={handleCanvasError}
    />
    
    <!-- Navigation Controls -->
    {#if totalPages > 1}
      <!-- Page Navigation Overlay -->
      <div class="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-75 text-white rounded-lg p-2 flex items-center space-x-3">
        <button 
          class="p-1 rounded hover:bg-white hover:bg-opacity-20 disabled:opacity-50 disabled:cursor-not-allowed"
          on:click={goToPreviousPage}
          disabled={currentPage <= 1}
          title="Previous page (Arrow Left)"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
          </svg>
        </button>
        
        <div class="flex items-center space-x-2">
          <input 
            type="number" 
            min="1" 
            max={totalPages}
            bind:value={currentPage}
            on:change={(e) => goToPage(parseInt(e.target.value))}
            class="w-12 px-1 py-0.5 text-center text-black text-sm rounded border-0 focus:ring-1 focus:ring-blue-400"
          />
          <span class="text-sm">of {totalPages}</span>
        </div>
        
        <button 
          class="p-1 rounded hover:bg-white hover:bg-opacity-20 disabled:opacity-50 disabled:cursor-not-allowed"
          on:click={goToNextPage}
          disabled={currentPage >= totalPages}
          title="Next page (Arrow Right)"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
          </svg>
        </button>
      </div>
      
      <!-- Side Navigation (for easier clicking) -->
      <button 
        class="absolute left-2 top-1/2 transform -translate-y-1/2 p-2 bg-black bg-opacity-50 text-white rounded-full hover:bg-opacity-75 disabled:opacity-30 disabled:cursor-not-allowed transition-opacity"
        on:click={goToPreviousPage}
        disabled={currentPage <= 1}
        title="Previous page"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
        </svg>
      </button>
      
      <button 
        class="absolute right-2 top-1/2 transform -translate-y-1/2 p-2 bg-black bg-opacity-50 text-white rounded-full hover:bg-opacity-75 disabled:opacity-30 disabled:cursor-not-allowed transition-opacity"
        on:click={goToNextPage}
        disabled={currentPage >= totalPages}
        title="Next page"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
        </svg>
      </button>
    {/if}
    
    <!-- Keyboard shortcuts hint -->
    <div class="absolute top-2 right-2 text-xs text-gray-500 bg-white bg-opacity-80 px-2 py-1 rounded">
      Use arrow keys to navigate
    </div>
  {/if}
</div>