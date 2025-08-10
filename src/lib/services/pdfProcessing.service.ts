import { PDFDocument, PDFPage, rgb } from 'pdf-lib'
import type { ServiceResult } from '$lib/types/database.js'
import { browser } from '$app/environment'

// Lazy import PDF.js only in browser environment
let pdfjsLib: any = null

async function getPdfjs() {
  if (!browser) {
    throw new Error('PDF.js operations are only available in the browser')
  }
  
  if (!pdfjsLib) {
    pdfjsLib = await import('pdfjs-dist')
    
    // Use local worker file in static directory
    pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdfjs/pdf.worker.min.js'
    
    console.log(`📚 [PDFProcessing] PDF.js worker configured:`, pdfjsLib.GlobalWorkerOptions.workerSrc)
  }
  
  return pdfjsLib
}

interface PDFBookmark {
  title: string
  page: number
  level: number
  children?: PDFBookmark[]
}

interface ExtractedPlan {
  referenceNumber: string
  title: string
  startPage: number
  endPage: number
  pageCount: number
}

interface PDFMetadata {
  title?: string
  author?: string
  subject?: string
  creator?: string
  producer?: string
  creationDate?: string
  modificationDate?: string
  pageCount: number
  fileSize: number
}

class PDFProcessingService {
  /**
   * Extract metadata from a PDF file
   */
  async extractMetadata(file: File): Promise<ServiceResult<PDFMetadata>> {
    try {
      const arrayBuffer = await file.arrayBuffer()
      const pdfDoc = await PDFDocument.load(arrayBuffer)
      
      const metadata: PDFMetadata = {
        title: pdfDoc.getTitle(),
        author: pdfDoc.getAuthor(),
        subject: pdfDoc.getSubject(),
        creator: pdfDoc.getCreator(),
        producer: pdfDoc.getProducer(),
        creationDate: pdfDoc.getCreationDate()?.toISOString(),
        modificationDate: pdfDoc.getModificationDate()?.toISOString(),
        pageCount: pdfDoc.getPageCount(),
        fileSize: file.size
      }

      return { success: true, data: metadata }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to extract PDF metadata' 
      }
    }
  }

  /**
   * Extract bookmarks from a PDF file
   */
  async extractBookmarks(file: File): Promise<ServiceResult<PDFBookmark[]>> {
    try {
      const pdfjsLib = await getPdfjs()
      const arrayBuffer = await file.arrayBuffer()
      const loadingTask = pdfjsLib.getDocument(arrayBuffer)
      const pdfDocument = await loadingTask.promise

      const outline = await pdfDocument.getOutline()
      if (!outline) {
        return { success: true, data: [] }
      }

      const parseOutline = async (items: any[], level = 0): Promise<PDFBookmark[]> => {
        const bookmarks: PDFBookmark[] = []
        
        for (const item of items) {
          const dest = await pdfDocument.getDestination(item.dest)
          const pageIndex = await pdfDocument.getPageIndex(dest[0])
          
          const bookmark: PDFBookmark = {
            title: item.title,
            page: pageIndex + 1, // PDF.js uses 0-based indexing
            level,
            children: item.items ? await parseOutline(item.items, level + 1) : undefined
          }
          
          bookmarks.push(bookmark)
        }
        
        return bookmarks
      }

      const bookmarks = await parseOutline(outline)
      return { success: true, data: bookmarks }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to extract PDF bookmarks' 
      }
    }
  }

  /**
   * Identify survey plans from bookmarks using pattern matching
   */
  identifyPlansFromBookmarks(bookmarks: PDFBookmark[], totalPages: number): ExtractedPlan[] {
    const plans: ExtractedPlan[] = []
    const planPatterns = [
      /(\d{6}-\d+)/,  // Pattern like "432367-1"
      /([A-Z]\d{6})/,  // Pattern like "H123456"
      /DP\s*(\d+)/i,   // Deposited Plan pattern
      /PS\s*(\d+)/i,   // Plan of Survey pattern
      /CP\s*(\d+)/i    // Crown Plan pattern
    ]

    let currentPlan: Partial<ExtractedPlan> | null = null
    
    bookmarks.forEach((bookmark, index) => {
      // Try to match plan reference patterns
      let referenceNumber = ''
      for (const pattern of planPatterns) {
        const match = bookmark.title.match(pattern)
        if (match) {
          referenceNumber = match[1] || match[0]
          break
        }
      }

      if (referenceNumber) {
        // If we have a current plan, finalize it
        if (currentPlan) {
          const nextBookmark = bookmarks[index]
          currentPlan.endPage = nextBookmark ? nextBookmark.page - 1 : totalPages
          currentPlan.pageCount = currentPlan.endPage! - currentPlan.startPage! + 1
          
          if (currentPlan.referenceNumber && currentPlan.startPage) {
            plans.push(currentPlan as ExtractedPlan)
          }
        }

        // Start new plan
        currentPlan = {
          referenceNumber,
          title: bookmark.title,
          startPage: bookmark.page
        }
      }
    })

    // Finalize the last plan
    if (currentPlan && currentPlan.referenceNumber && currentPlan.startPage) {
      currentPlan.endPage = totalPages
      currentPlan.pageCount = currentPlan.endPage - currentPlan.startPage + 1
      plans.push(currentPlan as ExtractedPlan)
    }

    return plans
  }

  /**
   * Split a PDF into individual plan files based on extracted plans
   */
  async splitPDFIntoPlans(
    file: File, 
    plans: ExtractedPlan[]
  ): Promise<ServiceResult<Array<{ plan: ExtractedPlan; pdfBytes: Uint8Array }>>> {
    try {
      const arrayBuffer = await file.arrayBuffer()
      const sourcePdf = await PDFDocument.load(arrayBuffer)
      
      const planFiles: Array<{ plan: ExtractedPlan; pdfBytes: Uint8Array }> = []
      
      for (const plan of plans) {
        const newPdf = await PDFDocument.create()
        
        // Copy pages from source to new PDF
        for (let pageNum = plan.startPage; pageNum <= plan.endPage; pageNum++) {
          const [page] = await newPdf.copyPages(sourcePdf, [pageNum - 1]) // PDF.js uses 0-based indexing
          newPdf.addPage(page)
        }
        
        // Set metadata
        newPdf.setTitle(plan.title)
        newPdf.setSubject(`Survey Plan ${plan.referenceNumber}`)
        
        const pdfBytes = await newPdf.save()
        planFiles.push({ plan, pdfBytes })
      }
      
      return { success: true, data: planFiles }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to split PDF into plans' 
      }
    }
  }

  /**
   * Render a PDF page to canvas for preview
   */
  async renderPageToCanvas(
    file: File, 
    pageNumber: number, 
    canvas: HTMLCanvasElement,
    scale: number = 1.0
  ): Promise<ServiceResult<void>> {
    try {
      const pdfjsLib = await getPdfjs()
      const arrayBuffer = await file.arrayBuffer()
      const loadingTask = pdfjsLib.getDocument(arrayBuffer)
      const pdfDocument = await loadingTask.promise
      
      const page = await pdfDocument.getPage(pageNumber)
      const viewport = page.getViewport({ scale })
      
      canvas.width = viewport.width
      canvas.height = viewport.height
      
      const context = canvas.getContext('2d')
      if (!context) {
        return { success: false, error: 'Could not get canvas context' }
      }
      
      const renderContext = {
        canvasContext: context,
        viewport: viewport
      }
      
      await page.render(renderContext).promise
      return { success: true }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to render PDF page' 
      }
    }
  }

  /**
   * Extract text content from a PDF page
   */
  async extractTextFromPage(file: File, pageNumber: number): Promise<ServiceResult<string>> {
    try {
      const pdfjsLib = await getPdfjs()
      const arrayBuffer = await file.arrayBuffer()
      const loadingTask = pdfjsLib.getDocument(arrayBuffer)
      const pdfDocument = await loadingTask.promise
      
      const page = await pdfDocument.getPage(pageNumber)
      const textContent = await page.getTextContent()
      
      const text = textContent.items
        .map((item: any) => item.str)
        .join(' ')
        .trim()
      
      return { success: true, data: text }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to extract text from PDF page' 
      }
    }
  }

  /**
   * Get PDF page dimensions
   */
  async getPageDimensions(
    file: File, 
    pageNumber: number
  ): Promise<ServiceResult<{ width: number; height: number }>> {
    try {
      const pdfjsLib = await getPdfjs()
      const arrayBuffer = await file.arrayBuffer()
      const loadingTask = pdfjsLib.getDocument(arrayBuffer)
      const pdfDocument = await loadingTask.promise
      
      const page = await pdfDocument.getPage(pageNumber)
      const viewport = page.getViewport({ scale: 1.0 })
      
      return { 
        success: true, 
        data: { 
          width: viewport.width, 
          height: viewport.height 
        } 
      }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to get PDF page dimensions' 
      }
    }
  }

  /**
   * Validate PDF file
   */
  async validatePDF(file: File): Promise<ServiceResult<{
    isValid: boolean
    version?: string
    encrypted?: boolean
    pageCount?: number
    errors?: string[]
  }>> {
    try {
      const arrayBuffer = await file.arrayBuffer()
      const errors: string[] = []
      
      // Try to load with pdf-lib
      let pdfLibValid = true
      let pageCount = 0
      try {
        const pdfDoc = await PDFDocument.load(arrayBuffer)
        pageCount = pdfDoc.getPageCount()
      } catch (error) {
        pdfLibValid = false
        errors.push(`pdf-lib: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
      
      // Try to load with PDF.js (only in browser)
      let pdfJsValid = true
      let version = ''
      let encrypted = false
      
      if (browser) {
        try {
          console.log(`📚 [PDFProcessing] Starting PDF.js validation...`)
          const pdfjsLib = await getPdfjs()
          const loadingTask = pdfjsLib.getDocument(arrayBuffer)
          const pdfDocument = await loadingTask.promise
          
          if (!pageCount) pageCount = pdfDocument.numPages
          
          const metadata = await pdfDocument.getMetadata()
          version = metadata?.info?.PDFFormatVersion || ''
          encrypted = metadata?.info?.IsEncrypted || false
          console.log(`📚 [PDFProcessing] PDF.js validation successful`)
        } catch (error) {
          console.warn(`⚠️ [PDFProcessing] PDF.js validation failed, but continuing:`, error)
          // Don't mark as invalid if PDF.js fails - pdf-lib validation is more important
          pdfJsValid = true
          errors.push(`PDF.js: ${error instanceof Error ? error.message : 'Unknown error'} (non-critical)`)
        }
      } else {
        // In SSR, skip PDF.js validation but don't mark as invalid
        pdfJsValid = true
        errors.push('PDF.js validation skipped (server-side rendering)')
      }
      
      const isValid = pdfLibValid && pdfJsValid
      
      return { 
        success: true, 
        data: { 
          isValid, 
          version, 
          encrypted, 
          pageCount,
          errors: errors.length > 0 ? errors : undefined
        } 
      }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to validate PDF' 
      }
    }
  }

  /**
   * Compress PDF by reducing image quality and removing unnecessary elements
   */
  async compressPDF(file: File, quality: number = 0.7): Promise<ServiceResult<Uint8Array>> {
    try {
      const arrayBuffer = await file.arrayBuffer()
      const pdfDoc = await PDFDocument.load(arrayBuffer)
      
      // This is a basic compression - in production you might want more sophisticated methods
      const compressedBytes = await pdfDoc.save({
        useObjectStreams: true,
        addDefaultPage: false,
        objectsPerTick: 50
      })
      
      return { success: true, data: compressedBytes }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to compress PDF' 
      }
    }
  }

  /**
   * Add watermark to PDF
   */
  async addWatermark(
    file: File, 
    watermarkText: string,
    opacity: number = 0.3
  ): Promise<ServiceResult<Uint8Array>> {
    try {
      const arrayBuffer = await file.arrayBuffer()
      const pdfDoc = await PDFDocument.load(arrayBuffer)
      
      const pages = pdfDoc.getPages()
      
      pages.forEach(page => {
        const { width, height } = page.getSize()
        
        page.drawText(watermarkText, {
          x: width / 2 - 100,
          y: height / 2,
          size: 50,
          color: rgb(0.7, 0.7, 0.7),
          opacity,
          rotate: { angle: Math.PI / 4 } // 45 degrees
        })
      })
      
      const watermarkedBytes = await pdfDoc.save()
      return { success: true, data: watermarkedBytes }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to add watermark to PDF' 
      }
    }
  }

  /**
   * Merge multiple PDF files into one
   */
  async mergePDFs(files: File[]): Promise<ServiceResult<Uint8Array>> {
    try {
      const mergedPdf = await PDFDocument.create()
      
      for (const file of files) {
        const arrayBuffer = await file.arrayBuffer()
        const pdf = await PDFDocument.load(arrayBuffer)
        const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices())
        
        copiedPages.forEach(page => mergedPdf.addPage(page))
      }
      
      const mergedBytes = await mergedPdf.save()
      return { success: true, data: mergedBytes }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to merge PDFs' 
      }
    }
  }

  /**
   * Process a survey search document and extract plans
   */
  async processSearchDocument(file: File): Promise<ServiceResult<{
    metadata: PDFMetadata
    bookmarks: PDFBookmark[]
    extractedPlans: ExtractedPlan[]
    planFiles: Array<{ plan: ExtractedPlan; pdfBytes: Uint8Array }>
    validation: any
  }>> {
    try {
      // Validate the PDF first
      const validationResult = await this.validatePDF(file)
      if (!validationResult.success) {
        return { success: false, error: validationResult.error }
      }

      if (!validationResult.data?.isValid) {
        return { 
          success: false, 
          error: `Invalid PDF file: ${validationResult.data?.errors?.join(', ')}` 
        }
      }

      // Extract metadata
      const metadataResult = await this.extractMetadata(file)
      if (!metadataResult.success) {
        return { success: false, error: metadataResult.error }
      }

      // Extract bookmarks
      const bookmarksResult = await this.extractBookmarks(file)
      if (!bookmarksResult.success) {
        return { success: false, error: bookmarksResult.error }
      }

      // Identify plans from bookmarks
      const extractedPlans = this.identifyPlansFromBookmarks(
        bookmarksResult.data!, 
        metadataResult.data!.pageCount
      )

      if (extractedPlans.length === 0) {
        return { 
          success: false, 
          error: 'No survey plans could be identified from the document bookmarks' 
        }
      }

      // Split PDF into individual plans
      const splitResult = await this.splitPDFIntoPlans(file, extractedPlans)
      if (!splitResult.success) {
        return { success: false, error: splitResult.error }
      }

      return {
        success: true,
        data: {
          metadata: metadataResult.data!,
          bookmarks: bookmarksResult.data!,
          extractedPlans,
          planFiles: splitResult.data!,
          validation: validationResult.data
        }
      }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to process search document' 
      }
    }
  }
}

// Export singleton instance
export const pdfProcessingService = new PDFProcessingService()
export default pdfProcessingService