<script lang="ts">
  import { onMount } from 'svelte'
  import type { PdfAnnotation } from '$lib/types/pdf-annotations.js'

  interface Props {
    pdfDoc: any
    totalPages: number
    currentPage: number
    onPageSelect: (pageNumber: number) => void
    annotations: PdfAnnotation[]
  }

  let {
    pdfDoc,
    totalPages,
    currentPage,
    onPageSelect,
    annotations
  }: Props = $props()

  let thumbnails: (HTMLCanvasElement | null)[] = []
  let thumbnailDataUrls: (string | null)[] = []
  let thumbnailContainer: HTMLDivElement | undefined
  let isGenerating = $state(false)
  let hasGenerated = $state(false)
  let generatedCount = $state(0)

  // Thumbnail settings
  const THUMBNAIL_WIDTH = 120
  const THUMBNAIL_HEIGHT = 160
  const THUMBNAIL_SCALE = 0.5

  onMount(() => {
    if (pdfDoc) {
      generateThumbnails()
    }
  })

  async function generateThumbnails() {
    console.log('[PdfThumbnailPanel] generateThumbnails called:', {
      pdfDoc: !!pdfDoc,
      isGenerating,
      hasGenerated,
      totalPages
    })
    
    if (!pdfDoc || isGenerating || hasGenerated || totalPages === 0) {
      console.log('[PdfThumbnailPanel] Skipping thumbnail generation:', {
        noPdfDoc: !pdfDoc,
        isGenerating,
        hasGenerated,
        noPages: totalPages === 0
      })
      return
    }

    isGenerating = true
    thumbnails = new Array(totalPages).fill(null)
    thumbnailDataUrls = new Array(totalPages).fill(null)
    generatedCount = 0
    console.log('[PdfThumbnailPanel] Starting thumbnail generation for', totalPages, 'pages')

    try {
      for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
        console.log('[PdfThumbnailPanel] Generating thumbnail for page', pageNum)
        const thumbnail = await generateThumbnail(pageNum)
        // Update the array in a way that triggers reactivity
        const newThumbnails = [...thumbnails]
        const newThumbnailDataUrls = [...thumbnailDataUrls]
        newThumbnails[pageNum - 1] = thumbnail
        newThumbnailDataUrls[pageNum - 1] = thumbnail ? thumbnail.toDataURL() : null
        thumbnails = newThumbnails
        thumbnailDataUrls = newThumbnailDataUrls
        generatedCount++
        console.log('[PdfThumbnailPanel] Generated thumbnail for page', pageNum, 'success:', !!thumbnail, 'progress:', generatedCount, '/', totalPages, 'dataUrl:', !!newThumbnailDataUrls[pageNum - 1])
      }
      hasGenerated = true
      console.log('[PdfThumbnailPanel] All thumbnails generated, total successful:', thumbnails.filter(t => t !== null).length)
    } catch (error) {
      console.error('[PdfThumbnailPanel] Failed to generate thumbnails:', error)
    } finally {
      isGenerating = false
    }
  }

  async function generateThumbnail(pageNumber: number): Promise<HTMLCanvasElement | null> {
    try {
      const page = await pdfDoc.getPage(pageNumber)
      const viewport = page.getViewport({ scale: THUMBNAIL_SCALE })
      
      const canvas = document.createElement('canvas')
      const context = canvas.getContext('2d')
      
      if (!context) return null

      canvas.width = viewport.width
      canvas.height = viewport.height

      const renderContext = {
        canvasContext: context,
        viewport: viewport
      }

      const renderTask = page.render(renderContext)
      await renderTask.promise
      
      return canvas
    } catch (error) {
      // Ignore transport destroyed and rendering cancelled errors
      if (error?.message?.includes('Transport destroyed') || error?.name === 'RenderingCancelledException') {
        console.log(`Thumbnail generation cancelled for page ${pageNumber} (ignored):`, error.message)
        return null
      }
      console.error(`Failed to generate thumbnail for page ${pageNumber}:`, error)
      return null
    }
  }

  function handlePageClick(pageNumber: number) {
    onPageSelect(pageNumber)
  }

  function getPageAnnotationCount(pageNumber: number): number {
    return annotations.filter(a => a.pageNumber === pageNumber).length
  }

  function scrollToCurrentPage() {
    if (!thumbnailContainer) return

    const thumbnailElement = thumbnailContainer.children[currentPage - 1] as HTMLElement
    if (thumbnailElement) {
      thumbnailElement.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      })
    }
  }

  // Auto-scroll to current page when it changes
  $effect(() => {
    if (currentPage) {
      scrollToCurrentPage()
    }
  })

  // Track PDF document to avoid regenerating unnecessarily
  let lastPdfDoc = $state(null)
  let lastTotalPages = $state(0)
  
  // Regenerate thumbnails when PDF document changes
  $effect(() => {
    console.log('[PdfThumbnailPanel] Effect triggered:', {
      pdfDoc: !!pdfDoc,
      totalPages,
      lastPdfDoc: !!lastPdfDoc,
      lastTotalPages,
      different: pdfDoc !== lastPdfDoc || totalPages !== lastTotalPages
    })
    
    if (pdfDoc && (pdfDoc !== lastPdfDoc || totalPages !== lastTotalPages)) {
      console.log('[PdfThumbnailPanel] PDF document changed, resetting generation state')
      lastPdfDoc = pdfDoc
      lastTotalPages = totalPages
      hasGenerated = false
      isGenerating = false
      generatedCount = 0
      thumbnails = []
      thumbnailDataUrls = []
      
      // Add a small delay to ensure the main viewer has completed its initial render
      setTimeout(() => {
        if (pdfDoc === lastPdfDoc && totalPages === lastTotalPages) {
          generateThumbnails()
        }
      }, 100)
    }
  })
</script>

<div class="thumbnail-panel h-full flex flex-col bg-gray-50">
  <!-- Header -->
  <div class="p-3 border-b border-gray-200 bg-white">
    <h3 class="text-sm font-medium text-gray-900">Pages</h3>
    <p class="text-xs text-gray-500 mt-1">{totalPages} pages</p>
  </div>

  <!-- Thumbnail Grid -->
  <div 
    bind:this={thumbnailContainer}
    class="flex-1 overflow-y-auto p-2 space-y-2"
  >
    {#if isGenerating && generatedCount === 0}
      <div class="flex items-center justify-center py-8">
        <div class="text-center">
          <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <div class="text-xs text-gray-500">Generating thumbnails...</div>
        </div>
      </div>
    {:else}
      {#each Array(totalPages) as _, index}
        {@const pageNumber = index + 1}
        {@const annotationCount = getPageAnnotationCount(pageNumber)}
        <div
          class="relative thumbnail-item cursor-pointer rounded-lg border-2 transition-all hover:shadow-md {currentPage === pageNumber ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white hover:border-gray-300'}"
          onclick={() => handlePageClick(pageNumber)}
          role="button"
          tabindex="0"
          onkeydown={(e) => e.key === 'Enter' && handlePageClick(pageNumber)}
        >
          <!-- Thumbnail Canvas Container -->
          <div class="p-2">
            <div 
              class="thumbnail-canvas bg-white border border-gray-100 rounded shadow-sm overflow-hidden"
              style="width: {THUMBNAIL_WIDTH}px; height: {THUMBNAIL_HEIGHT}px;"
            >
              {#if thumbnailDataUrls[index]}
                <img
                  src={thumbnailDataUrls[index]}
                  alt="Page {pageNumber} thumbnail"
                  style="width: 100%; height: 100%; object-fit: contain;"
                />
              {:else if isGenerating}
                <div class="w-full h-full flex items-center justify-center bg-gray-100">
                  <div class="text-xs text-gray-400">Loading...</div>
                </div>
              {:else}
                <div class="w-full h-full flex items-center justify-center bg-gray-100">
                  <div class="text-xs text-red-400">Failed</div>
                  <!-- Debug info -->
                  <div class="text-xs text-gray-400 mt-1">
                    {#if thumbnailDataUrls.length > index}
                      {thumbnailDataUrls[index] ? 'has' : 'null'}
                    {:else}
                      'missing'
                    {/if}
                  </div>
                </div>
              {/if}
            </div>
          </div>

          <!-- Page Info -->
          <div class="px-2 pb-2">
            <div class="flex items-center justify-between">
              <span class="text-xs font-medium text-gray-700">
                Page {pageNumber}
              </span>
              
              {#if annotationCount > 0}
                <div class="flex items-center space-x-1">
                  <div class="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span class="text-xs text-blue-600">{annotationCount}</span>
                </div>
              {/if}
            </div>
          </div>

          <!-- Current Page Indicator -->
          {#if currentPage === pageNumber}
            <div class="absolute top-1 right-1 w-3 h-3 bg-blue-500 rounded-full border-2 border-white"></div>
          {/if}

          <!-- Annotation Count Badge -->
          {#if annotationCount > 0}
            <div class="absolute top-1 left-1 bg-blue-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
              {annotationCount}
            </div>
          {/if}
        </div>
      {/each}
    {/if}
  </div>

  <!-- Footer with controls -->
  <div class="p-2 border-t border-gray-200 bg-white">
    <div class="flex items-center justify-between">
      <button
        class="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50"
        onclick={() => onPageSelect(1)}
        disabled={currentPage === 1}
      >
        First
      </button>
      
      <div class="text-xs text-gray-500">
        {currentPage} / {totalPages}
      </div>
      
      <button
        class="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50"
        onclick={() => onPageSelect(totalPages)}
        disabled={currentPage === totalPages}
      >
        Last
      </button>
    </div>
  </div>
</div>

<style>
  .thumbnail-panel {
    min-width: 160px;
    max-width: 200px;
  }

  .thumbnail-item {
    user-select: none;
  }

  .thumbnail-item:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  .thumbnail-canvas {
    display: flex;
    align-items: center;
    justify-content: center;
  }
</style>

<script context="module">
  // Custom action to draw thumbnail on canvas
  function drawThumbnail(canvas: HTMLCanvasElement, sourceCanvas: HTMLCanvasElement) {
    console.log('[drawThumbnail] Initial draw:', { 
      canvas: !!canvas, 
      sourceCanvas: !!sourceCanvas,
      sourceWidth: sourceCanvas?.width,
      sourceHeight: sourceCanvas?.height 
    })
    
    const ctx = canvas.getContext('2d')
    if (ctx && sourceCanvas) {
      canvas.width = sourceCanvas.width
      canvas.height = sourceCanvas.height
      ctx.drawImage(sourceCanvas, 0, 0)
      console.log('[drawThumbnail] Drew thumbnail on canvas:', { width: canvas.width, height: canvas.height })
    } else {
      console.warn('[drawThumbnail] Missing context or source canvas:', { ctx: !!ctx, sourceCanvas: !!sourceCanvas })
    }

    return {
      update(newSourceCanvas: HTMLCanvasElement) {
        console.log('[drawThumbnail] Update draw:', { 
          canvas: !!canvas, 
          newSourceCanvas: !!newSourceCanvas,
          sourceWidth: newSourceCanvas?.width,
          sourceHeight: newSourceCanvas?.height 
        })
        
        const ctx = canvas.getContext('2d')
        if (ctx && newSourceCanvas) {
          canvas.width = newSourceCanvas.width
          canvas.height = newSourceCanvas.height
          ctx.clearRect(0, 0, canvas.width, canvas.height)
          ctx.drawImage(newSourceCanvas, 0, 0)
          console.log('[drawThumbnail] Updated thumbnail on canvas:', { width: canvas.width, height: canvas.height })
        } else {
          console.warn('[drawThumbnail] Missing context or source canvas on update:', { ctx: !!ctx, newSourceCanvas: !!newSourceCanvas })
        }
      }
    }
  }
</script>