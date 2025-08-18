<script lang="ts">
  import { onMount, onDestroy, createEventDispatcher } from 'svelte'
  import { browser } from '$app/environment'
  import type { 
    PdfAnnotation, 
    DrawingState, 
    PdfViewerConfig,
    AnnotationType,
    AnnotationEvent,
    PdfPoint,
    CanvasPoint
  } from '$lib/types/pdf-annotations.js'

  interface Props {
    annotations: PdfAnnotation[]
    drawingState: DrawingState
    viewerConfig: PdfViewerConfig
    canvasWidth: number
    canvasHeight: number
    pdfScale: number
    currentPage: number
  }

  let {
    annotations,
    drawingState,
    viewerConfig,
    canvasWidth,
    canvasHeight,
    pdfScale,
    currentPage
  }: Props = $props()

  const dispatch = createEventDispatcher<{
    'annotation-created': AnnotationEvent
    'annotation-updated': AnnotationEvent
    'annotation-deleted': AnnotationEvent
  }>()

  let layerRef: HTMLDivElement | undefined
  let drawingCanvas: HTMLCanvasElement | undefined
  let overlayCanvas: HTMLCanvasElement | undefined
  let isDrawing = $state(false)
  let currentPath: CanvasPoint[] = $state([])
  let startPoint: CanvasPoint | null = $state(null)
  let currentAnnotation: Partial<PdfAnnotation> | null = $state(null)

  // Mouse/touch state
  let lastPointerEvent: PointerEvent | null = null
  let pointerCache: PointerEvent[] = []

  onMount(() => {
    if (browser) {
      setupCanvas()
      bindEvents()
    }
  })

  onDestroy(() => {
    unbindEvents()
  })

  function setupCanvas() {
    if (!drawingCanvas || !overlayCanvas) return

    // Set canvas dimensions
    drawingCanvas.width = canvasWidth
    drawingCanvas.height = canvasHeight
    overlayCanvas.width = canvasWidth
    overlayCanvas.height = canvasHeight

    // Set display size
    drawingCanvas.style.width = `${canvasWidth}px`
    drawingCanvas.style.height = `${canvasHeight}px`
    overlayCanvas.style.width = `${canvasWidth}px`
    overlayCanvas.style.height = `${canvasHeight}px`

    // Configure drawing context
    const ctx = drawingCanvas.getContext('2d')
    if (ctx) {
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.imageSmoothingEnabled = true
    }

    // Configure overlay context
    const overlayCtx = overlayCanvas.getContext('2d')
    if (overlayCtx) {
      overlayCtx.lineCap = 'round'
      overlayCtx.lineJoin = 'round'
      overlayCtx.imageSmoothingEnabled = true
    }

    // Redraw existing annotations
    redrawAnnotations()
  }

  function bindEvents() {
    if (!layerRef) return

    layerRef.addEventListener('pointerdown', handlePointerDown, { passive: false })
    layerRef.addEventListener('pointermove', handlePointerMove, { passive: false })
    layerRef.addEventListener('pointerup', handlePointerUp, { passive: false })
    layerRef.addEventListener('pointercancel', handlePointerCancel, { passive: false })
    
    // Prevent default touch behaviors
    layerRef.addEventListener('touchstart', e => e.preventDefault(), { passive: false })
    layerRef.addEventListener('touchmove', e => e.preventDefault(), { passive: false })
    layerRef.addEventListener('touchend', e => e.preventDefault(), { passive: false })
  }

  function unbindEvents() {
    if (!layerRef) return

    layerRef.removeEventListener('pointerdown', handlePointerDown)
    layerRef.removeEventListener('pointermove', handlePointerMove)
    layerRef.removeEventListener('pointerup', handlePointerUp)
    layerRef.removeEventListener('pointercancel', handlePointerCancel)
  }

  function getPointFromEvent(event: PointerEvent): CanvasPoint {
    const rect = layerRef!.getBoundingClientRect()
    
    // Convert screen coordinates to canvas coordinates
    // The display size should match canvasWidth/canvasHeight since we're using display dimensions now
    const x = (event.clientX - rect.left) * (canvasWidth / rect.width)
    const y = (event.clientY - rect.top) * (canvasHeight / rect.height)
    
    console.log('[PdfAnnotationLayer] getPointFromEvent:', {
      clientX: event.clientX,
      clientY: event.clientY,
      rectLeft: rect.left,
      rectTop: rect.top,
      rectWidth: rect.width,
      rectHeight: rect.height,
      canvasWidth,
      canvasHeight,
      pdfScale,
      resultX: x,
      resultY: y
    })
    
    return {
      x,
      y,
      pressure: event.pressure || 0.5
    }
  }

  function handlePointerDown(event: PointerEvent) {
    if (viewerConfig.readonly || drawingState.activeTool === 'select' || drawingState.activeTool === 'pan') {
      return
    }

    event.preventDefault()
    event.stopPropagation()

    const point = getPointFromEvent(event)
    startPoint = point
    isDrawing = true
    currentPath = [point]

    // Start new annotation
    currentAnnotation = {
      id: generateId(),
      type: drawingState.activeTool as AnnotationType,
      pageNumber: currentPage,
      coordinates: {
        canvasCoords: {
          x: point.x,
          y: point.y,
          path: [point]
        },
        pdfCoords: {
          x: point.x / pdfScale, // Convert back to PDF units
          y: (canvasHeight - point.y) / pdfScale, // Convert to PDF coordinate system
          path: [{ x: point.x / pdfScale, y: (canvasHeight - point.y) / pdfScale, pressure: point.pressure }]
        },
        pageWidth: canvasWidth,
        pageHeight: canvasHeight,
        scale: pdfScale
      },
      properties: { ...drawingState.currentProperties! },
      metadata: {
        title: '',
        description: '',
        tags: [],
        version: 1
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      user_id: 'current-user', // TODO: Get from auth store
      project_id: '' // TODO: Get from props
    }

    // Capture pointer for smooth drawing
    layerRef?.setPointerCapture(event.pointerId)
    
    // Handle different tool types
    switch (drawingState.activeTool) {
      case 'text':
        handleTextStart(point)
        break
      case 'freehand':
        startFreehandDrawing(point)
        break
      default:
        startShapeDrawing(point)
        break
    }
  }

  function handlePointerMove(event: PointerEvent) {
    if (!isDrawing || !currentAnnotation) return

    event.preventDefault()
    const point = getPointFromEvent(event)

    switch (drawingState.activeTool) {
      case 'freehand':
        continueFreehandDrawing(point)
        break
      default:
        updateShapeDrawing(point)
        break
    }
  }

  function handlePointerUp(event: PointerEvent) {
    if (!isDrawing || !currentAnnotation) return

    event.preventDefault()
    isDrawing = false

    const point = getPointFromEvent(event)

    // Finalize annotation based on tool type
    switch (drawingState.activeTool) {
      case 'freehand':
        finalizeFreehandDrawing(point)
        break
      case 'text':
        finalizeTextAnnotation(point)
        break
      default:
        finalizeShapeDrawing(point)
        break
    }

    // Release pointer capture
    layerRef?.releasePointerCapture(event.pointerId)
    
    // Reset drawing state
    startPoint = null
    currentPath = []
    clearOverlay()
  }

  function handlePointerCancel(event: PointerEvent) {
    isDrawing = false
    currentAnnotation = null
    startPoint = null
    currentPath = []
    clearOverlay()
    layerRef?.releasePointerCapture(event.pointerId)
  }

  function startFreehandDrawing(point: CanvasPoint) {
    if (!drawingCanvas) return
    
    const ctx = drawingCanvas.getContext('2d')
    if (!ctx) return

    ctx.beginPath()
    ctx.moveTo(point.x, point.y)
    
    // Set drawing properties
    ctx.strokeStyle = drawingState.currentProperties?.strokeColor || '#3B82F6'
    ctx.lineWidth = drawingState.currentProperties?.strokeWidth || 2
    ctx.globalAlpha = drawingState.currentProperties?.opacity || 1
  }

  function continueFreehandDrawing(point: CanvasPoint) {
    if (!drawingCanvas || !currentAnnotation) return
    
    const ctx = drawingCanvas.getContext('2d')
    if (!ctx) return

    // Add point to path
    currentPath.push(point)
    
    // Draw line to new point
    ctx.lineTo(point.x, point.y)
    ctx.stroke()

    // Update annotation coordinates
    if (currentAnnotation.coordinates) {
      currentAnnotation.coordinates.canvasCoords.path = [...currentPath]
      currentAnnotation.coordinates.pdfCoords.path = currentPath.map(p => ({
        x: p.x / pdfScale,
        y: (canvasHeight - p.y) / pdfScale,
        pressure: p.pressure
      }))
    }
  }

  function finalizeFreehandDrawing(point: CanvasPoint) {
    if (!currentAnnotation) return

    // Add final point
    currentPath.push(point)
    
    // Update final coordinates
    if (currentAnnotation.coordinates) {
      currentAnnotation.coordinates.canvasCoords.path = currentPath
      currentAnnotation.coordinates.pdfCoords.path = currentPath.map(p => ({
        x: p.x / pdfScale,
        y: (canvasHeight - p.y) / pdfScale,
        pressure: p.pressure
      }))
    }

    // Dispatch annotation created event
    dispatchAnnotationCreated(currentAnnotation as PdfAnnotation)
  }

  function startShapeDrawing(point: CanvasPoint) {
    // Shapes are drawn on overlay canvas for preview
  }

  function updateShapeDrawing(point: CanvasPoint) {
    if (!overlayCanvas || !startPoint || !currentAnnotation) return

    const ctx = overlayCanvas.getContext('2d')
    if (!ctx) return

    // Clear overlay
    ctx.clearRect(0, 0, canvasWidth, canvasHeight)

    // Set drawing properties
    ctx.strokeStyle = drawingState.currentProperties?.strokeColor || '#3B82F6'
    ctx.fillStyle = drawingState.currentProperties?.fillColor || '#3B82F6'
    ctx.lineWidth = drawingState.currentProperties?.strokeWidth || 2
    ctx.globalAlpha = drawingState.currentProperties?.opacity || 1

    const width = point.x - startPoint.x
    const height = point.y - startPoint.y

    // Draw shape based on tool
    switch (drawingState.activeTool) {
      case 'rectangle':
        ctx.strokeRect(startPoint.x, startPoint.y, width, height)
        if (drawingState.currentProperties?.fillOpacity && drawingState.currentProperties.fillOpacity > 0) {
          ctx.globalAlpha = drawingState.currentProperties.fillOpacity
          ctx.fillRect(startPoint.x, startPoint.y, width, height)
        }
        break
        
      case 'circle':
        const radius = Math.sqrt(width * width + height * height) / 2
        const centerX = startPoint.x + width / 2
        const centerY = startPoint.y + height / 2
        ctx.beginPath()
        ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI)
        ctx.stroke()
        if (drawingState.currentProperties?.fillOpacity && drawingState.currentProperties.fillOpacity > 0) {
          ctx.globalAlpha = drawingState.currentProperties.fillOpacity
          ctx.fill()
        }
        break
        
      case 'line':
        ctx.beginPath()
        ctx.moveTo(startPoint.x, startPoint.y)
        ctx.lineTo(point.x, point.y)
        ctx.stroke()
        break
        
      case 'arrow':
        drawArrow(ctx, startPoint, point)
        break
    }

    // Update annotation coordinates
    currentAnnotation.coordinates = {
      canvasCoords: {
        x: Math.min(startPoint.x, point.x),
        y: Math.min(startPoint.y, point.y),
        width: Math.abs(width),
        height: Math.abs(height)
      },
      pdfCoords: {
        x: Math.min(startPoint.x, point.x) / pdfScale,
        y: (canvasHeight - Math.max(startPoint.y, point.y)) / pdfScale,
        width: Math.abs(width) / pdfScale,
        height: Math.abs(height) / pdfScale
      },
      pageWidth: canvasWidth,
      pageHeight: canvasHeight,
      scale: pdfScale
    }
  }

  function finalizeShapeDrawing(point: CanvasPoint) {
    if (!drawingCanvas || !currentAnnotation) return

    const ctx = drawingCanvas.getContext('2d')
    if (!ctx) return

    // Copy from overlay to main canvas
    const overlayImageData = overlayCanvas?.getContext('2d')?.getImageData(0, 0, canvasWidth, canvasHeight)
    if (overlayImageData) {
      ctx.putImageData(overlayImageData, 0, 0)
    }

    // Dispatch annotation created event
    dispatchAnnotationCreated(currentAnnotation as PdfAnnotation)
  }

  function handleTextStart(point: CanvasPoint) {
    // For text annotations, we'll show an input field
    // This is a simplified implementation
    const text = prompt('Enter text:')
    if (text && currentAnnotation) {
      currentAnnotation.properties!.text = text
      drawTextAnnotation(currentAnnotation as PdfAnnotation, point)
      dispatchAnnotationCreated(currentAnnotation as PdfAnnotation)
    }
    isDrawing = false
  }

  function finalizeTextAnnotation(point: CanvasPoint) {
    // Text is handled in handleTextStart
  }

  function drawTextAnnotation(annotation: PdfAnnotation, point: CanvasPoint) {
    if (!drawingCanvas) return

    const ctx = drawingCanvas.getContext('2d')
    if (!ctx) return

    const text = annotation.properties.text || ''
    const fontSize = annotation.properties.fontSize || 14
    const fontFamily = annotation.properties.fontFamily || 'Arial'
    const fontWeight = annotation.properties.fontWeight || 'normal'
    const fontStyle = annotation.properties.fontStyle || 'normal'

    ctx.font = `${fontStyle} ${fontWeight} ${fontSize}px ${fontFamily}`
    ctx.fillStyle = annotation.properties.strokeColor
    ctx.globalAlpha = annotation.properties.opacity || 1
    ctx.fillText(text, point.x, point.y)
  }

  function drawArrow(ctx: CanvasRenderingContext2D, start: CanvasPoint, end: CanvasPoint) {
    const headLength = 10
    const headAngle = Math.PI / 6

    // Draw main line
    ctx.beginPath()
    ctx.moveTo(start.x, start.y)
    ctx.lineTo(end.x, end.y)
    ctx.stroke()

    // Calculate arrow head
    const angle = Math.atan2(end.y - start.y, end.x - start.x)
    
    // Draw arrow head
    ctx.beginPath()
    ctx.moveTo(end.x, end.y)
    ctx.lineTo(
      end.x - headLength * Math.cos(angle - headAngle),
      end.y - headLength * Math.sin(angle - headAngle)
    )
    ctx.moveTo(end.x, end.y)
    ctx.lineTo(
      end.x - headLength * Math.cos(angle + headAngle),
      end.y - headLength * Math.sin(angle + headAngle)
    )
    ctx.stroke()
  }

  function redrawAnnotations() {
    if (!drawingCanvas) return

    const ctx = drawingCanvas.getContext('2d')
    if (!ctx) return

    // Clear canvas
    ctx.clearRect(0, 0, canvasWidth, canvasHeight)

    // Redraw all annotations
    annotations.forEach(annotation => {
      drawAnnotation(ctx, annotation)
    })
  }

  function drawAnnotation(ctx: CanvasRenderingContext2D, annotation: PdfAnnotation) {
    if (!annotation.properties.visible) return

    // Set drawing properties
    ctx.strokeStyle = annotation.properties.strokeColor
    ctx.fillStyle = annotation.properties.fillColor || annotation.properties.strokeColor
    ctx.lineWidth = annotation.properties.strokeWidth
    ctx.globalAlpha = annotation.properties.opacity
    ctx.lineCap = annotation.properties.lineCap || 'round'
    ctx.lineJoin = annotation.properties.lineJoin || 'round'

    // Convert PDF coordinates back to current canvas coordinates
    // This accounts for zoom changes since the annotation was created
    const pdfCoords = annotation.coordinates.pdfCoords
    const currentScale = pdfScale
    
    const coords = {
      x: pdfCoords.x * currentScale,
      y: canvasHeight - (pdfCoords.y * currentScale),
      width: pdfCoords.width ? pdfCoords.width * currentScale : undefined,
      height: pdfCoords.height ? pdfCoords.height * currentScale : undefined,
      path: pdfCoords.path ? pdfCoords.path.map(p => ({
        x: p.x * currentScale,
        y: canvasHeight - (p.y * currentScale),
        pressure: p.pressure
      })) : undefined
    }

    switch (annotation.type) {
      case 'freehand':
        if (coords.path && coords.path.length > 1) {
          ctx.beginPath()
          ctx.moveTo(coords.path[0].x, coords.path[0].y)
          for (let i = 1; i < coords.path.length; i++) {
            ctx.lineTo(coords.path[i].x, coords.path[i].y)
          }
          ctx.stroke()
        }
        break

      case 'rectangle':
        ctx.strokeRect(coords.x, coords.y, coords.width || 0, coords.height || 0)
        if (annotation.properties.fillOpacity && annotation.properties.fillOpacity > 0) {
          ctx.globalAlpha = annotation.properties.fillOpacity
          ctx.fillRect(coords.x, coords.y, coords.width || 0, coords.height || 0)
        }
        break

      case 'circle':
        const radius = Math.min(coords.width || 0, coords.height || 0) / 2
        const centerX = coords.x + (coords.width || 0) / 2
        const centerY = coords.y + (coords.height || 0) / 2
        ctx.beginPath()
        ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI)
        ctx.stroke()
        if (annotation.properties.fillOpacity && annotation.properties.fillOpacity > 0) {
          ctx.globalAlpha = annotation.properties.fillOpacity
          ctx.fill()
        }
        break

      case 'line':
        ctx.beginPath()
        ctx.moveTo(coords.x, coords.y)
        ctx.lineTo(coords.x + (coords.width || 0), coords.y + (coords.height || 0))
        ctx.stroke()
        break

      case 'text':
        const text = annotation.properties.text || ''
        const fontSize = annotation.properties.fontSize || 14
        const fontFamily = annotation.properties.fontFamily || 'Arial'
        const fontWeight = annotation.properties.fontWeight || 'normal'
        const fontStyle = annotation.properties.fontStyle || 'normal'

        ctx.font = `${fontStyle} ${fontWeight} ${fontSize}px ${fontFamily}`
        ctx.fillText(text, coords.x, coords.y)
        break

      case 'highlight':
        ctx.globalAlpha = annotation.properties.fillOpacity || 0.3
        ctx.fillRect(coords.x, coords.y, coords.width || 0, coords.height || 0)
        break
    }

    // Reset alpha
    ctx.globalAlpha = 1
  }

  function clearOverlay() {
    if (!overlayCanvas) return
    const ctx = overlayCanvas.getContext('2d')
    ctx?.clearRect(0, 0, canvasWidth, canvasHeight)
  }

  function dispatchAnnotationCreated(annotation: PdfAnnotation) {
    dispatch('annotation-created', {
      type: 'create',
      annotation,
      user_id: annotation.user_id,
      timestamp: annotation.created_at
    })
    currentAnnotation = null
  }

  function generateId(): string {
    return `annotation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  // Track dimensions to avoid unnecessary re-setup
  let lastCanvasWidth = $state(0)
  let lastCanvasHeight = $state(0)
  let lastPdfScale = $state(1)
  
  // Re-setup canvas when dimensions or scale change
  $effect(() => {
    if (canvasWidth && canvasHeight && (canvasWidth !== lastCanvasWidth || canvasHeight !== lastCanvasHeight || pdfScale !== lastPdfScale)) {
      console.log('[PdfAnnotationLayer] Canvas properties changed:', { 
        canvasWidth, canvasHeight, pdfScale,
        lastCanvasWidth, lastCanvasHeight, lastPdfScale,
        dimensionsChanged: canvasWidth !== lastCanvasWidth || canvasHeight !== lastCanvasHeight,
        scaleChanged: pdfScale !== lastPdfScale
      })
      lastCanvasWidth = canvasWidth
      lastCanvasHeight = canvasHeight
      lastPdfScale = pdfScale
      setupCanvas()
    }
  })

  // Track annotations to avoid unnecessary redraws
  let lastAnnotationsLength = $state(0)
  let lastAnnotationsHash = $state('')
  
  // Redraw annotations when they change
  $effect(() => {
    const annotationsHash = JSON.stringify(annotations.map(a => ({ id: a.id, coordinates: a.coordinates, properties: a.properties })))
    
    if (annotations.length !== lastAnnotationsLength || annotationsHash !== lastAnnotationsHash) {
      console.log('[PdfAnnotationLayer] Annotations changed, redrawing')
      lastAnnotationsLength = annotations.length
      lastAnnotationsHash = annotationsHash
      redrawAnnotations()
    }
  })
</script>

<div 
  bind:this={layerRef}
  class="annotation-layer absolute inset-0 pointer-events-auto"
  style="width: {canvasWidth}px; height: {canvasHeight}px;"
>
  <!-- Main drawing canvas for permanent annotations -->
  <canvas
    bind:this={drawingCanvas}
    class="absolute inset-0"
    style="pointer-events: none;"
  ></canvas>
  
  <!-- Overlay canvas for drawing previews -->
  <canvas
    bind:this={overlayCanvas}
    class="absolute inset-0"
    style="pointer-events: none;"
  ></canvas>
  
  <!-- Selection handles and UI elements would go here -->
  {#if drawingState.selectedAnnotations.length > 0}
    <div class="absolute inset-0 pointer-events-none">
      <!-- Selection handles for selected annotations -->
      {#each annotations.filter(a => drawingState.selectedAnnotations.includes(a.id)) as annotation}
        <div 
          class="absolute border-2 border-blue-500 pointer-events-auto"
          style="
            left: {annotation.coordinates.canvasCoords.x}px;
            top: {annotation.coordinates.canvasCoords.y}px;
            width: {annotation.coordinates.canvasCoords.width || 4}px;
            height: {annotation.coordinates.canvasCoords.height || 4}px;
          "
        >
          <!-- Resize handles -->
          <div class="absolute -top-1 -left-1 w-2 h-2 bg-blue-500 cursor-nw-resize"></div>
          <div class="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 cursor-ne-resize"></div>
          <div class="absolute -bottom-1 -left-1 w-2 h-2 bg-blue-500 cursor-sw-resize"></div>
          <div class="absolute -bottom-1 -right-1 w-2 h-2 bg-blue-500 cursor-se-resize"></div>
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  .annotation-layer {
    touch-action: none;
    cursor: crosshair;
  }
  
  .annotation-layer.select-mode {
    cursor: default;
  }
  
  .annotation-layer.pan-mode {
    cursor: grab;
  }
  
  .annotation-layer.pan-mode:active {
    cursor: grabbing;
  }
</style>