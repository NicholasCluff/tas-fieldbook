<script lang="ts">
  import { onMount, onDestroy } from 'svelte'
  import { createEventDispatcher } from 'svelte'
  import { browser } from '$app/environment'
  import type { 
    PdfAnnotation, 
    DrawingState, 
    ToolbarState, 
    PdfViewerConfig,
    AnnotationType,
    AnnotationEvent,
    ViewerEvent
  } from '$lib/types/pdf-annotations.js'
  
  // Import sub-components
  import PdfAnnotationToolbar from './PdfAnnotationToolbar.svelte'
  import PdfAnnotationLayer from './PdfAnnotationLayer.svelte'
  import PdfThumbnailPanel from './PdfThumbnailPanel.svelte'

  // Props interface
  interface Props {
    src: string
    projectId: string
    width?: number
    height?: number
    config?: Partial<PdfViewerConfig>
    readonly?: boolean
    annotations?: PdfAnnotation[]
  }

  let { 
    src, 
    projectId,
    width = 800, 
    height = 600,
    config = {},
    readonly = false,
    annotations = []
  }: Props = $props()

  // Event dispatcher
  const dispatch = createEventDispatcher<{
    'annotation-created': AnnotationEvent
    'annotation-updated': AnnotationEvent
    'annotation-deleted': AnnotationEvent
    'annotations-loaded': PdfAnnotation[]
    'viewer-ready': void
    'page-changed': { pageNumber: number }
    'zoom-changed': { zoom: number }
    'error': { message: string; error?: Error }
  }>()

  // Component state
  let containerRef = $state<HTMLDivElement>()
  let canvasRef = $state<HTMLCanvasElement>()
  let annotationLayerRef = $state<HTMLDivElement>()
  
  let loading = $state(true)
  let error = $state('')
  let pdfDoc = $state<any>(null)
  let currentPage = $state(1)
  let totalPages = $state(0)
  let renderTask = $state<any>(null)
  let isLoadingPdf = $state(false)
  let isRendering = $state(false)
  
  // Canvas scaling information for annotation layer
  let canvasDisplayWidth = $state(0)
  let canvasDisplayHeight = $state(0)
  let pdfScale = $state(1)
  
  // PDF.js library - lazy loaded
  let pdfjsLib: any = null

  // Drawing and annotation state
  let drawingState = $state<DrawingState>({
    activeTool: 'select',
    isDrawing: false,
    selectedAnnotations: [],
    clipboard: [],
    currentProperties: {
      strokeColor: '#3B82F6',
      fillColor: '#3B82F6',
      strokeWidth: 2,
      opacity: 1,
      fillOpacity: 0.3,
      fontSize: 14,
      fontFamily: 'Arial',
      visible: true,
      locked: false
    },
    snapToGrid: false,
    gridSize: 10,
    showGrid: false,
    zoom: 1,
    pan: { x: 0, y: 0 },
    rotation: 0
  })

  let toolbarState = $state<ToolbarState>({
    activePanel: 'tools',
    showThumbnails: true,
    showMeasurements: true,
    showComments: true,
    drawingTools: ['freehand', 'text', 'highlight', 'rectangle', 'circle', 'arrow', 'line', 'measurement'],
    selectionTools: ['select', 'pan', 'zoom'],
    recentColors: ['#3B82F6', '#EF4444', '#10B981', '#F59E0B'],
    recentStrokeWidths: [1, 2, 3, 5]
  })

  // Default configuration
  const defaultConfig: PdfViewerConfig = {
    enableThumbnails: true,
    enableLayers: true,
    enableMeasurements: true,
    enableComments: true,
    enableExport: true,
    enableTouch: true,
    enableKeyboardShortcuts: true,
    enableContextMenu: true,
    enableCollaboration: false,
    maxZoom: 5,
    minZoom: 0.25,
    renderAhead: 2,
    cacheSize: 100,
    enableCoordinateLinking: true,
    enableMapIntegration: true,
    enablePhotoOverlay: true,
    defaultMeasurementUnit: 'm',
    readonly: false,
    allowedTools: ['freehand', 'text', 'highlight', 'rectangle', 'circle', 'arrow', 'line', 'measurement'],
    requireApproval: false
  }

  // Merge user config with defaults
  let viewerConfig = $derived({ ...defaultConfig, ...config })

  // Filtered annotations for current page
  let pageAnnotations = $derived(
    annotations.filter(annotation => annotation.pageNumber === currentPage)
  )

  // Lazy load PDF.js only in browser
  async function loadPdfJs() {
    if (!browser || pdfjsLib) return pdfjsLib
    
    try {
      pdfjsLib = await import('pdfjs-dist')
      pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdfjs/pdf.worker.min.mjs'
      console.log('[PdfAnnotationViewer] PDF.js loaded successfully')
      return pdfjsLib
    } catch (err) {
      console.error('[PdfAnnotationViewer] Failed to load PDF.js:', err)
      throw err
    }
  }

  onMount(() => {
    if (src) {
      loadPdf()
    }
  })

  onDestroy(() => {
    cleanup()
  })

  function cleanup() {
    if (renderTask) {
      try {
        renderTask.cancel()
      } catch (e) {
        console.log('[PdfAnnotationViewer] Cleanup render task cancel failed (ignored):', e.message)
      }
      renderTask = null
    }
    if (pdfDoc) {
      try {
        pdfDoc.destroy()
      } catch (e) {
        console.log('[PdfAnnotationViewer] Cleanup PDF destroy failed (ignored):', e.message)
      }
      pdfDoc = null
    }
    isLoadingPdf = false
    isRendering = false
  }

  async function loadPdf() {
    if (!browser || isLoadingPdf) {
      console.log('[PdfAnnotationViewer] Skipping PDF load - not in browser or already loading')
      return
    }

    try {
      isLoadingPdf = true
      loading = true
      error = ''
      console.log('[PdfAnnotationViewer] Loading PDF from:', src)

      // Load PDF.js first
      const pdfLib = await loadPdfJs()
      if (!pdfLib) {
        throw new Error('Failed to load PDF.js library')
      }

      // Fetch PDF data as blob to handle authentication
      const response = await fetch(src)
      if (!response.ok) {
        throw new Error(`Failed to fetch PDF: ${response.status} ${response.statusText}`)
      }

      const pdfArrayBuffer = await response.arrayBuffer()
      console.log('[PdfAnnotationViewer] PDF data loaded, size:', pdfArrayBuffer.byteLength)

      // Load PDF document
      pdfDoc = await pdfLib.getDocument({ data: pdfArrayBuffer }).promise
      totalPages = pdfDoc.numPages
      console.log('[PdfAnnotationViewer] PDF loaded successfully, pages:', totalPages)

      // Initialize tracking variables before first render
      lastPageRendered = currentPage
      lastZoom = drawingState.zoom
      lastRotation = drawingState.rotation
      
      // Render first page
      await renderPage(currentPage)
      loading = false

      // Notify that viewer is ready
      dispatch('viewer-ready')

    } catch (err) {
      console.error('[PdfAnnotationViewer] PDF loading error:', err)
      error = err instanceof Error ? err.message : 'Failed to load PDF'
      loading = false
      dispatch('error', { 
        message: error, 
        error: err instanceof Error ? err : undefined 
      })
    } finally {
      isLoadingPdf = false
    }
  }

  async function renderPage(pageNumber: number) {
    if (!pdfDoc || !canvasRef || !browser || isRendering) {
      console.log('[PdfAnnotationViewer] Cannot render - missing requirements:', {
        pdfDoc: !!pdfDoc,
        canvasRef: !!canvasRef,
        browser,
        isRendering
      })
      return
    }

    try {
      isRendering = true
      console.log('[PdfAnnotationViewer] Rendering page:', pageNumber, 'of', totalPages)
      
      // Cancel any ongoing render task
      if (renderTask) {
        try {
          renderTask.cancel()
        } catch (e) {
          // Ignore cancel errors
          console.log('[PdfAnnotationViewer] Render task cancel failed (ignored):', e.message)
        }
        renderTask = null
      }

      const page = await pdfDoc.getPage(pageNumber)
      const canvas = canvasRef
      const context = canvas.getContext('2d')

      // Clear canvas first
      context.clearRect(0, 0, canvas.width, canvas.height)

      // Calculate scale based on desired width and zoom
      const viewport = page.getViewport({ scale: 1 })
      const scale = (width * drawingState.zoom) / viewport.width
      const scaledViewport = page.getViewport({ 
        scale, 
        rotation: drawingState.rotation 
      })

      // Set canvas dimensions
      canvas.width = scaledViewport.width
      canvas.height = scaledViewport.height
      canvas.style.width = `${scaledViewport.width}px`
      canvas.style.height = `${scaledViewport.height}px`
      
      // Update scaling information for annotation layer
      canvasDisplayWidth = scaledViewport.width
      canvasDisplayHeight = scaledViewport.height
      pdfScale = scale

      // Render the page
      const renderContext = {
        canvasContext: context,
        viewport: scaledViewport
      }

      renderTask = page.render(renderContext)
      await renderTask.promise
      renderTask = null
      console.log('[PdfAnnotationViewer] Page', pageNumber, 'rendered successfully')

      // Update annotation layer dimensions
      if (annotationLayerRef) {
        annotationLayerRef.style.width = `${scaledViewport.width}px`
        annotationLayerRef.style.height = `${scaledViewport.height}px`
      }

    } catch (err) {
      if (err?.name !== 'RenderingCancelledException' && !err?.message?.includes('Transport destroyed')) {
        console.error('[PdfAnnotationViewer] Page rendering error:', err)
        error = 'Failed to render PDF page'
        dispatch('error', { 
          message: error, 
          error: err instanceof Error ? err : undefined 
        })
      } else {
        console.log('[PdfAnnotationViewer] Render cancelled or transport destroyed (ignored):', err.message)
      }
    } finally {
      isRendering = false
    }
  }

  // Track specific values that should trigger re-render to avoid infinite loops
  let lastPageRendered = $state(0)
  let lastZoom = $state(1)
  let lastRotation = $state(0)
  let isRenderingFromEffect = $state(false)
  
  // Re-render when zoom, rotation, or page changes
  $effect(() => {
    if (pdfDoc && canvasRef && !loading && !isLoadingPdf && !isRendering && !isRenderingFromEffect) {
      const currentZoom = drawingState.zoom
      const currentRotation = drawingState.rotation
      
      const needsRerender = (
        currentPage !== lastPageRendered ||
        currentZoom !== lastZoom ||
        currentRotation !== lastRotation
      )
      
      if (needsRerender) {
        console.log('[PdfAnnotationViewer] Effect triggering re-render:', {
          page: currentPage,
          lastPage: lastPageRendered,
          zoom: currentZoom,
          lastZoom,
          rotation: currentRotation,
          lastRotation
        })
        
        lastPageRendered = currentPage
        lastZoom = currentZoom
        lastRotation = currentRotation
        isRenderingFromEffect = true
        
        renderPage(currentPage).finally(() => {
          isRenderingFromEffect = false
        })
      }
    }
  })

  // Re-load PDF when src changes
  let lastSrc = $state('')
  $effect(() => {
    if (src && browser && src !== lastSrc) {
      lastSrc = src
      cleanup()
      loadPdf()
    }
  })

  // Navigation functions
  function goToNextPage() {
    if (currentPage < totalPages) {
      currentPage += 1
      dispatch('page-changed', { pageNumber: currentPage })
    }
  }

  function goToPreviousPage() {
    if (currentPage > 1) {
      currentPage -= 1
      dispatch('page-changed', { pageNumber: currentPage })
    }
  }

  function goToPage(pageNum: number) {
    if (pageNum >= 1 && pageNum <= totalPages && pageNum !== currentPage) {
      currentPage = pageNum
      dispatch('page-changed', { pageNumber: currentPage })
    }
  }

  // Zoom functions
  function zoomIn() {
    const newZoom = Math.min(drawingState.zoom * 1.25, viewerConfig.maxZoom)
    setZoom(newZoom)
  }

  function zoomOut() {
    const newZoom = Math.max(drawingState.zoom / 1.25, viewerConfig.minZoom)
    setZoom(newZoom)
  }

  function setZoom(zoom: number) {
    drawingState.zoom = Math.max(viewerConfig.minZoom, Math.min(viewerConfig.maxZoom, zoom))
    dispatch('zoom-changed', { zoom: drawingState.zoom })
  }

  function resetZoom() {
    setZoom(1)
  }

  function fitToWidth() {
    if (containerRef && canvasRef) {
      const containerWidth = containerRef.clientWidth - (viewerConfig.enableThumbnails ? 200 : 0)
      const scale = containerWidth / canvasRef.width
      setZoom(scale)
    }
  }

  // Tool selection
  function selectTool(tool: AnnotationType | 'select' | 'pan' | 'zoom') {
    drawingState.activeTool = tool
    drawingState.selectedAnnotations = []
  }

  // Annotation event handlers
  function handleAnnotationCreated(event: CustomEvent<AnnotationEvent>) {
    const annotation = event.detail.annotation
    annotations = [...annotations, annotation]
    dispatch('annotation-created', event.detail)
  }

  function handleAnnotationUpdated(event: CustomEvent<AnnotationEvent>) {
    const updatedAnnotation = event.detail.annotation
    annotations = annotations.map(a => 
      a.id === updatedAnnotation.id ? updatedAnnotation : a
    )
    dispatch('annotation-updated', event.detail)
  }

  function handleAnnotationDeleted(event: CustomEvent<AnnotationEvent>) {
    const deletedAnnotation = event.detail.annotation
    annotations = annotations.filter(a => a.id !== deletedAnnotation.id)
    dispatch('annotation-deleted', event.detail)
  }

  // Keyboard shortcuts
  function handleKeyDown(event: KeyboardEvent) {
    if (!viewerConfig.enableKeyboardShortcuts) return

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
      case '=':
      case '+':
        if (event.ctrlKey || event.metaKey) {
          event.preventDefault()
          zoomIn()
        }
        break
      case '-':
        if (event.ctrlKey || event.metaKey) {
          event.preventDefault()
          zoomOut()
        }
        break
      case '0':
        if (event.ctrlKey || event.metaKey) {
          event.preventDefault()
          resetZoom()
        }
        break
      case 'Escape':
        drawingState.selectedAnnotations = []
        drawingState.activeTool = 'select'
        break
    }
  }

  // Export current page annotations as images
  async function exportPageAsImage(format: 'png' | 'jpeg' = 'png'): Promise<string> {
    if (!canvasRef) throw new Error('Canvas not available')
    
    return canvasRef.toDataURL(`image/${format}`)
  }

  // Public API for parent components
  export function getCurrentPage(): number {
    return currentPage
  }

  export function getTotalPages(): number {
    return totalPages
  }

  export function getZoom(): number {
    return drawingState.zoom
  }

  export function getSelectedAnnotations(): PdfAnnotation[] {
    return annotations.filter(a => drawingState.selectedAnnotations.includes(a.id))
  }

  export function clearSelection(): void {
    drawingState.selectedAnnotations = []
  }

  export function selectAnnotation(annotationId: string): void {
    if (!drawingState.selectedAnnotations.includes(annotationId)) {
      drawingState.selectedAnnotations = [...drawingState.selectedAnnotations, annotationId]
    }
  }

  export function deleteSelectedAnnotations(): void {
    const toDelete = getSelectedAnnotations()
    toDelete.forEach(annotation => {
      handleAnnotationDeleted(new CustomEvent('annotation-deleted', {
        detail: {
          type: 'delete',
          annotation,
          user_id: 'current-user', // TODO: Get from auth store
          timestamp: new Date().toISOString()
        }
      }))
    })
    drawingState.selectedAnnotations = []
  }
</script>

<div 
  bind:this={containerRef}
  class="pdf-annotation-viewer flex h-full w-full bg-gray-100 overflow-hidden"
  style="width: {width}px; height: {height}px;"
  tabindex="0"
  onkeydown={handleKeyDown}
  role="application"
  aria-label="PDF Annotation Viewer"
>
  <!-- Thumbnail Panel -->
  {#if viewerConfig.enableThumbnails && toolbarState.showThumbnails}
    <div class="w-48 border-r border-gray-300 bg-white overflow-hidden">
      <PdfThumbnailPanel
        {pdfDoc}
        {totalPages}
        {currentPage}
        onPageSelect={goToPage}
        annotations={pageAnnotations}
      />
    </div>
  {/if}

  <!-- Main Content Area -->
  <div class="flex-1 flex flex-col overflow-hidden">
    <!-- Toolbar -->
    {#if !readonly}
      <PdfAnnotationToolbar
        bind:drawingState
        bind:toolbarState
        {viewerConfig}
        {currentPage}
        {totalPages}
        onPreviousPage={goToPreviousPage}
        onNextPage={goToNextPage}
        onZoomIn={zoomIn}
        onZoomOut={zoomOut}
        onResetZoom={resetZoom}
        onFitToWidth={fitToWidth}
        onToolSelect={selectTool}
      />
    {/if}

    <!-- PDF Display Area -->
    <div class="flex-1 relative overflow-auto bg-gray-200">
      {#if loading}
        <div class="absolute inset-0 flex items-center justify-center bg-white">
          <div class="text-center">
            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
            <div class="text-gray-500 text-sm">Loading PDF...</div>
          </div>
        </div>
      {/if}
      
      {#if error}
        <div class="absolute inset-0 flex items-center justify-center bg-white">
          <div class="text-center">
            <div class="text-red-500 mb-2">Failed to load PDF</div>
            <div class="text-sm text-gray-500 mb-3">{error}</div>
            <button 
              class="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
              onclick={loadPdf}
            >
              Retry
            </button>
          </div>
        </div>
      {:else if !loading}
        <div class="flex items-center justify-center p-4">
          <div class="relative shadow-lg">
            <!-- PDF Canvas -->
            <canvas
              bind:this={canvasRef}
              class="border border-gray-300 bg-white"
              style="transform: translate({drawingState.pan.x}px, {drawingState.pan.y}px);"
            ></canvas>
            
            <!-- Annotation Layer -->
            <div 
              bind:this={annotationLayerRef}
              class="absolute top-0 left-0 pointer-events-none"
              style="transform: translate({drawingState.pan.x}px, {drawingState.pan.y}px);"
            >
              <PdfAnnotationLayer
                annotations={pageAnnotations}
                {drawingState}
                {viewerConfig}
                canvasWidth={canvasDisplayWidth}
                canvasHeight={canvasDisplayHeight}
                {pdfScale}
                {currentPage}
                on:annotation-created={handleAnnotationCreated}
                on:annotation-updated={handleAnnotationUpdated}
                on:annotation-deleted={handleAnnotationDeleted}
              />
            </div>

            <!-- Page Navigation Overlay -->
            {#if totalPages > 1}
              <div class="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-75 text-white rounded-lg p-2 flex items-center space-x-3">
                <button 
                  class="p-1 rounded hover:bg-white hover:bg-opacity-20 disabled:opacity-50"
                  onclick={goToPreviousPage}
                  disabled={currentPage <= 1}
                  title="Previous page"
                >
                  ←
                </button>
                
                <div class="flex items-center space-x-2">
                  <input 
                    type="number" 
                    min="1" 
                    max={totalPages}
                    bind:value={currentPage}
                    onchange={(e) => goToPage(parseInt(e.currentTarget.value))}
                    class="w-12 px-1 py-0.5 text-center text-black text-sm rounded"
                  />
                  <span class="text-sm">of {totalPages}</span>
                </div>
                
                <button 
                  class="p-1 rounded hover:bg-white hover:bg-opacity-20 disabled:opacity-50"
                  onclick={goToNextPage}
                  disabled={currentPage >= totalPages}
                  title="Next page"
                >
                  →
                </button>
              </div>
            {/if}
          </div>
        </div>
      {/if}
    </div>
  </div>
</div>

<style>
  .pdf-annotation-viewer {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  }
  
  .pdf-annotation-viewer:focus {
    outline: none;
  }
</style>