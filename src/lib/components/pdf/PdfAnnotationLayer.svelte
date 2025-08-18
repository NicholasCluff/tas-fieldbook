<script lang="ts">
  import { onMount, onDestroy, createEventDispatcher } from 'svelte'
  import { browser } from '$app/environment'
  import { pdfAnnotationsService } from '$lib/services/pdfAnnotations.service.js'
  import { getCurrentUser } from '$lib/utils/supabase.js'
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
    planId?: string
    projectId?: string
  }

  let {
    annotations,
    drawingState = $bindable(),
    viewerConfig,
    canvasWidth,
    canvasHeight,
    pdfScale,
    currentPage,
    planId,
    projectId
  }: Props = $props()

  const dispatch = createEventDispatcher<{
    'annotation-created': AnnotationEvent
    'annotation-updated': AnnotationEvent
    'annotation-deleted': AnnotationEvent
    'zoom-at-point': { factor: number; center: { x: number; y: number }; point: CanvasPoint }
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
  
  // Pan state (not used with dragscroll)
  // let isPanning = $state(false)
  // let lastPanPoint: CanvasPoint | null = $state(null)

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
    const ctx = drawingCanvas.getContext('2d', { willReadFrequently: true })
    if (ctx) {
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.imageSmoothingEnabled = true
    }

    // Configure overlay context
    const overlayCtx = overlayCanvas.getContext('2d', { willReadFrequently: true })
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
    
    
    return {
      x,
      y,
      pressure: event.pressure || 0.5
    }
  }

  function handlePointerDown(event: PointerEvent) {
    if (viewerConfig.readonly) {
      return
    }

    // Middle-click is handled by browser (e.g., for scrolling)
    if (event.button === 1) { // Middle mouse button
      // Let browser handle middle-click (auto-scroll, etc.)
      return
    }

    // Handle different tools
    if (drawingState.activeTool === 'select') {
      handleSelectPointerDown(event)
      return
    } else if (drawingState.activeTool === 'pan') {
      // Pan is handled by dragscroll action on the parent container
      return
    } else if (drawingState.activeTool === 'zoom') {
      handleZoomPointerDown(event)
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
      user_id: '', // Will be set when saving
      project_id: projectId || '',
      plan_id: planId
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
        const radius = Math.min(Math.abs(width), Math.abs(height)) / 2
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
    if (drawingState.activeTool === 'line' || drawingState.activeTool === 'arrow') {
      // For lines and arrows, store actual start and end points to preserve direction
      currentAnnotation.coordinates = {
        canvasCoords: {
          x: startPoint.x,
          y: startPoint.y,
          path: [startPoint, point]
        },
        pdfCoords: {
          x: startPoint.x / pdfScale,
          y: (canvasHeight - startPoint.y) / pdfScale,
          path: [
            { x: startPoint.x / pdfScale, y: (canvasHeight - startPoint.y) / pdfScale, pressure: startPoint.pressure },
            { x: point.x / pdfScale, y: (canvasHeight - point.y) / pdfScale, pressure: point.pressure }
          ]
        },
        pageWidth: canvasWidth,
        pageHeight: canvasHeight,
        scale: pdfScale
      }
    } else {
      // For other shapes (rectangles, circles), use bounding box
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
      y: canvasHeight - (pdfCoords.y * currentScale) - (pdfCoords.height ? pdfCoords.height * currentScale : 0),
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
        if (coords.path && coords.path.length >= 2) {
          // Use stored path for directional lines
          ctx.beginPath()
          ctx.moveTo(coords.path[0].x, coords.path[0].y)
          ctx.lineTo(coords.path[1].x, coords.path[1].y)
          ctx.stroke()
        } else {
          // Fallback for old annotations without path data
          ctx.beginPath()
          ctx.moveTo(coords.x, coords.y)
          ctx.lineTo(coords.x + (coords.width || 0), coords.y + (coords.height || 0))
          ctx.stroke()
        }
        break

      case 'arrow':
        if (coords.path && coords.path.length >= 2) {
          // Use stored path for directional arrows
          const startPoint = { x: coords.path[0].x, y: coords.path[0].y, pressure: coords.path[0].pressure || 0.5 }
          const endPoint = { x: coords.path[1].x, y: coords.path[1].y, pressure: coords.path[1].pressure || 0.5 }
          drawArrow(ctx, startPoint, endPoint)
        } else {
          // Fallback for old annotations without path data
          const startPoint = { x: coords.x, y: coords.y, pressure: 0.5 }
          const endPoint = { x: coords.x + (coords.width || 0), y: coords.y + (coords.height || 0), pressure: 0.5 }
          drawArrow(ctx, startPoint, endPoint)
        }
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

  // Select tool handlers
  function handleSelectPointerDown(event: PointerEvent) {
    event.preventDefault()
    event.stopPropagation()
    
    const point = getPointFromEvent(event)
    
    // Check if clicking on an existing annotation
    const clickedAnnotation = findAnnotationAtPoint(point)
    
    if (clickedAnnotation) {
      // Handle annotation selection
      if (event.ctrlKey || event.metaKey) {
        // Multi-select with Ctrl/Cmd
        if (drawingState.selectedAnnotations.includes(clickedAnnotation.id)) {
          drawingState.selectedAnnotations = drawingState.selectedAnnotations.filter(id => id !== clickedAnnotation.id)
        } else {
          drawingState.selectedAnnotations = [...drawingState.selectedAnnotations, clickedAnnotation.id]
        }
      } else {
        // Single select
        drawingState.selectedAnnotations = [clickedAnnotation.id]
      }
    } else {
      // Click on empty space - clear selection
      drawingState.selectedAnnotations = []
    }
  }

  // Pan tool handlers - now handled by dragscroll action
  // These functions are no longer needed as dragscroll handles pan functionality

  // Zoom tool handlers
  function handleZoomPointerDown(event: PointerEvent) {
    event.preventDefault()
    event.stopPropagation()
    
    const point = getPointFromEvent(event)
    
    // Zoom in on left click, zoom out on right click or with modifier key
    const zoomOut = event.button === 2 || event.shiftKey
    const zoomFactor = zoomOut ? 0.8 : 1.25
    
    // Calculate zoom center point
    const zoomCenter = {
      x: point.x / canvasWidth,
      y: point.y / canvasHeight
    }
    
    // Dispatch zoom event to parent
    dispatch('zoom-at-point', { 
      factor: zoomFactor, 
      center: zoomCenter,
      point 
    })
  }

  // Helper function to find annotation at a point
  function findAnnotationAtPoint(point: CanvasPoint): PdfAnnotation | null {
    // Check annotations in reverse order (top to bottom)
    for (let i = annotations.length - 1; i >= 0; i--) {
      const annotation = annotations[i]
      if (annotation.pageNumber !== currentPage) continue
      
      // Convert PDF coordinates to current scale (same as drawing logic)
      const pdfCoords = annotation.coordinates.pdfCoords
      const currentScale = pdfScale
      
      const scaledCoords = {
        x: pdfCoords.x * currentScale,
        y: canvasHeight - (pdfCoords.y * currentScale) - (pdfCoords.height ? pdfCoords.height * currentScale : 0),
        width: pdfCoords.width ? pdfCoords.width * currentScale : 0,
        height: pdfCoords.height ? pdfCoords.height * currentScale : 0,
        path: pdfCoords.path ? pdfCoords.path.map(p => ({
          x: p.x * currentScale,
          y: canvasHeight - (p.y * currentScale),
          pressure: p.pressure
        })) : undefined
      }
      
      if (annotation.type === 'freehand') {
        // For freehand, check if point is near the path
        if (scaledCoords.path && isPointNearPath(point, scaledCoords.path)) {
          return annotation
        }
      } else {
        // For shapes, check if point is inside bounding box
        const x = scaledCoords.x
        const y = scaledCoords.y
        const width = scaledCoords.width
        const height = scaledCoords.height
        
        if (point.x >= x && point.x <= x + width &&
            point.y >= y && point.y <= y + height) {
          return annotation
        }
      }
    }
    return null
  }

  // Helper function to check if point is near a path (for freehand annotations)
  function isPointNearPath(point: CanvasPoint, path: CanvasPoint[], threshold = 10): boolean {
    for (let i = 0; i < path.length - 1; i++) {
      const p1 = path[i]
      const p2 = path[i + 1]
      
      // Calculate distance from point to line segment
      const distance = distanceToLineSegment(point, p1, p2)
      if (distance <= threshold) {
        return true
      }
    }
    return false
  }

  // Helper function to calculate distance from point to line segment
  function distanceToLineSegment(point: CanvasPoint, p1: CanvasPoint, p2: CanvasPoint): number {
    const A = point.x - p1.x
    const B = point.y - p1.y
    const C = p2.x - p1.x
    const D = p2.y - p1.y

    const dot = A * C + B * D
    const lenSq = C * C + D * D
    let param = -1
    
    if (lenSq !== 0) {
      param = dot / lenSq
    }

    let xx, yy

    if (param < 0) {
      xx = p1.x
      yy = p1.y
    } else if (param > 1) {
      xx = p2.x
      yy = p2.y
    } else {
      xx = p1.x + param * C
      yy = p1.y + param * D
    }

    const dx = point.x - xx
    const dy = point.y - yy
    return Math.sqrt(dx * dx + dy * dy)
  }

  async function dispatchAnnotationCreated(annotation: PdfAnnotation) {
    // Set saving state
    const event: AnnotationEvent = {
      type: 'create',
      annotation,
      user_id: annotation.user_id,
      timestamp: annotation.created_at,
      planId,
      projectId,
      saving: true
    }
    
    dispatch('annotation-created', event)

    // Save to database if we have the necessary context
    if (planId && projectId) {
      try {
        const user = await getCurrentUser()
        if (!user) {
          dispatch('annotation-created', {
            ...event,
            saving: false,
            error: 'User not authenticated'
          })
          return
        }

        // Set the user ID on the annotation
        annotation.user_id = user.id

        const result = await pdfAnnotationsService.createAnnotation({
          planId,
          projectId,
          annotation
        })

        if (result.success && result.data) {
          // Update annotation with saved data (including any server-generated fields)
          const savedAnnotation = result.data
          dispatch('annotation-created', {
            type: 'create',
            annotation: savedAnnotation,
            user_id: savedAnnotation.user_id,
            timestamp: savedAnnotation.created_at,
            planId,
            projectId,
            saving: false
          })
        } else {
          dispatch('annotation-created', {
            ...event,
            saving: false,
            error: result.error || 'Failed to save annotation'
          })
        }
      } catch (error) {
        dispatch('annotation-created', {
          ...event,
          saving: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    } else {
      // No database context, just dispatch without saving
      dispatch('annotation-created', {
        ...event,
        saving: false
      })
    }

    currentAnnotation = null
  }

  function generateId(): string {
    // Generate a UUID v4 compatible string
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0
      const v = c == 'x' ? r : (r & 0x3 | 0x8)
      return v.toString(16)
    })
  }

  // Track dimensions to avoid unnecessary re-setup
  let lastCanvasWidth = $state(0)
  let lastCanvasHeight = $state(0)
  let lastPdfScale = $state(1)
  
  // Re-setup canvas when dimensions or scale change
  $effect(() => {
    if (canvasWidth && canvasHeight && (canvasWidth !== lastCanvasWidth || canvasHeight !== lastCanvasHeight || pdfScale !== lastPdfScale)) {
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
      lastAnnotationsLength = annotations.length
      lastAnnotationsHash = annotationsHash
      redrawAnnotations()
    }
  })
</script>

<div 
  bind:this={layerRef}
  class="annotation-layer absolute inset-0 pointer-events-auto"
  class:select-mode={drawingState.activeTool === 'select'}
  class:pan-mode={drawingState.activeTool === 'pan'}
  class:zoom-mode={drawingState.activeTool === 'zoom'}
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
        {@const pdfCoords = annotation.coordinates.pdfCoords}
        {@const currentScale = pdfScale}
        {@const scaledCoords = {
          x: pdfCoords.x * currentScale,
          y: canvasHeight - (pdfCoords.y * currentScale) - (pdfCoords.height ? pdfCoords.height * currentScale : 0),
          width: pdfCoords.width ? pdfCoords.width * currentScale : 4,
          height: pdfCoords.height ? pdfCoords.height * currentScale : 4
        }}
        <div 
          class="absolute border-2 border-blue-500 pointer-events-auto"
          style="
            left: {scaledCoords.x}px;
            top: {scaledCoords.y}px;
            width: {scaledCoords.width}px;
            height: {scaledCoords.height}px;
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
  
  .annotation-layer.zoom-mode {
    cursor: zoom-in;
  }
  
  /* Hover effects for different tools */
  .annotation-layer.select-mode:hover {
    cursor: pointer;
  }
  
  .annotation-layer.zoom-mode:hover {
    cursor: zoom-in;
  }
  
  /* When holding shift with zoom tool for zoom out */
  .annotation-layer.zoom-mode:hover:active {
    cursor: zoom-out;
  }
</style>