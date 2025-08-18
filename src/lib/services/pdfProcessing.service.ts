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

interface ProcessingProgress {
  stage: 'analyzing' | 'extracting' | 'splitting' | 'uploading' | 'complete'
  progress: number
  message: string
  currentPlan?: string
}

interface SplitPlanResult {
  plan: ExtractedPlan
  pdfData: Uint8Array
  fileName: string
}

interface ProcessedDocument {
  plans: ExtractedPlan[]
  splitPlans: SplitPlanResult[]
  metadata: PDFMetadata
  originalFileName: string
}

class PDFProcessingService {
  /**
   * Extract metadata from a PDF file
   */
  async extractMetadata(file: File): Promise<ServiceResult<PDFMetadata>> {
    try {
      console.log(`📄 [PDFProcessing] Starting metadata extraction for: ${file.name}`)
      
      const arrayBuffer = await file.arrayBuffer()
      console.log(`📄 [PDFProcessing] File loaded to array buffer: ${arrayBuffer.byteLength} bytes`)
      
      const pdfDoc = await PDFDocument.load(arrayBuffer)
      console.log(`📄 [PDFProcessing] PDF document loaded with pdf-lib, pages: ${pdfDoc.getPageCount()}`)
      
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

      console.log(`📄 [PDFProcessing] Metadata extracted successfully:`, metadata)
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
      console.log(`📚 [PDFProcessing] Starting bookmark extraction for: ${file.name}`)
      const pdfjsLib = await getPdfjs()
      console.log(`📚 [PDFProcessing] PDF.js library loaded successfully`)
      
      const arrayBuffer = await file.arrayBuffer()
      console.log(`📚 [PDFProcessing] File loaded to array buffer: ${arrayBuffer.byteLength} bytes`)
      
      const loadingTask = pdfjsLib.getDocument(arrayBuffer)
      console.log(`📚 [PDFProcessing] PDF document loading task created`)
      
      const pdfDocument = await loadingTask.promise
      console.log(`📚 [PDFProcessing] PDF document loaded successfully, pages: ${pdfDocument.numPages}`)

      const outline = await pdfDocument.getOutline()
      console.log(`📚 [PDFProcessing] Outline extracted:`, outline ? `${outline.length} items` : 'no outline')
      
      if (!outline) {
        return { success: true, data: [] }
      }

      const parseOutline = async (items: any[], level = 0): Promise<PDFBookmark[]> => {
        const bookmarks: PDFBookmark[] = []
        
        for (let i = 0; i < items.length; i++) {
          try {
            const item = items[i]
            console.log(`📚 [PDFProcessing] Processing bookmark ${i + 1}/${items.length}: "${item.title}"`)
            
            let pageIndex = 0
            
            // Handle different destination formats
            if (typeof item.dest === 'string') {
              // Named destination
              try {
                const dest = await pdfDocument.getDestination(item.dest)
                if (dest && dest.length > 0) {
                  pageIndex = await pdfDocument.getPageIndex(dest[0])
                }
              } catch (destError) {
                console.warn(`⚠️ [PDFProcessing] Could not resolve named destination "${item.dest}":`, destError)
                // Try to extract page number from title or use default
                const pageMatch = item.title.match(/(\d+)/)
                pageIndex = pageMatch ? parseInt(pageMatch[1]) - 1 : 0
              }
            } else if (Array.isArray(item.dest)) {
              // Direct destination array
              try {
                pageIndex = await pdfDocument.getPageIndex(item.dest[0])
              } catch (destError) {
                console.warn(`⚠️ [PDFProcessing] Could not resolve direct destination:`, destError)
                pageIndex = 0
              }
            } else {
              console.warn(`⚠️ [PDFProcessing] Unknown destination format for bookmark "${item.title}":`, item.dest)
              pageIndex = 0
            }
            
            console.log(`📚 [PDFProcessing] Resolved page index for bookmark "${item.title}": ${pageIndex}`)
            
            const bookmark: PDFBookmark = {
              title: item.title,
              page: pageIndex + 1, // PDF.js uses 0-based indexing
              level,
              children: item.items ? await parseOutline(item.items, level + 1) : undefined
            }
            
            bookmarks.push(bookmark)
            console.log(`📚 [PDFProcessing] Successfully processed bookmark: "${bookmark.title}" -> page ${bookmark.page}`)
          } catch (error) {
            console.error(`❌ [PDFProcessing] Failed to process bookmark ${i + 1}:`, error)
            // Continue processing other bookmarks instead of failing completely
          }
        }
        
        return bookmarks
      }

      const bookmarks = await parseOutline(outline)
      console.log(`📚 [PDFProcessing] Successfully extracted ${bookmarks.length} bookmarks`)
      return { success: true, data: bookmarks }
    } catch (error) {
      console.error(`❌ [PDFProcessing] Bookmark extraction failed:`, error)
      
      // Don't fail completely if bookmark extraction fails - return empty array
      // This allows processing to continue with manual plan detection or other methods
      console.warn(`⚠️ [PDFProcessing] Returning empty bookmark array to allow processing to continue`)
      return { success: true, data: [] }
    }
  }

  /**
   * Identify survey plans from bookmarks using pattern matching
   */
  identifyPlansFromBookmarks(bookmarks: PDFBookmark[], totalPages: number): ExtractedPlan[] {
    const plans: ExtractedPlan[] = []
    const planPatterns = [
      /^(\d{4,6})$/,   // Simple 4-6 digit numbers (like "134166", "66461")
      /(\d{6}-\d+)/,   // Pattern like "432367-1"
      /([A-Z]\d{6})/,  // Pattern like "H123456"
      /DP\s*(\d+)/i,   // Deposited Plan pattern
      /PS\s*(\d+)/i,   // Plan of Survey pattern
      /CP\s*(\d+)/i,   // Crown Plan pattern
      /Plan\s+(\d+)/i, // "Plan 123" pattern
      /(\d+)/          // Fallback: any sequence of digits
    ]

    let currentPlan: Partial<ExtractedPlan> | null = null
    
    console.log(`🔍 [PDFProcessing] Identifying plans from ${bookmarks.length} bookmarks`)
    
    bookmarks.forEach((bookmark, index) => {
      // Try to match plan reference patterns
      let referenceNumber = ''
      console.log(`🔍 [PDFProcessing] Checking bookmark ${index + 1}: "${bookmark.title}" (page ${bookmark.page})`)
      
      for (const pattern of planPatterns) {
        const match = bookmark.title.match(pattern)
        if (match) {
          referenceNumber = match[1] || match[0]
          console.log(`✅ [PDFProcessing] Pattern matched: "${pattern}" -> "${referenceNumber}"`)
          break
        }
      }

      if (referenceNumber) {
        console.log(`📄 [PDFProcessing] Found plan reference: "${referenceNumber}"`)
        
        // Check if this is a continuation of the current plan (same reference number)
        if (currentPlan && currentPlan.referenceNumber === referenceNumber) {
          // Same plan continues, just extend the end page (will be set when plan changes or ends)
          console.log(`📄 [PDFProcessing] Extending existing plan: "${referenceNumber}" to include page ${bookmark.page}`)
        } else {
          // Different plan number, finalize previous and start new one
          if (currentPlan) {
            currentPlan.endPage = bookmark.page - 1
            currentPlan.pageCount = currentPlan.endPage! - currentPlan.startPage! + 1
            
            console.log(`📄 [PDFProcessing] Finalizing previous plan:`, currentPlan)
            
            if (currentPlan.referenceNumber && currentPlan.startPage) {
              plans.push(currentPlan as ExtractedPlan)
              console.log(`✅ [PDFProcessing] Added plan to collection: "${currentPlan.referenceNumber}"`)
            }
          }

          // Start new plan
          currentPlan = {
            referenceNumber,
            title: bookmark.title,
            startPage: bookmark.page
          }
          
          console.log(`📄 [PDFProcessing] Started new plan:`, currentPlan)
        }
      } else {
        console.log(`⚠️ [PDFProcessing] No pattern matched for bookmark: "${bookmark.title}"`)
      }
    })

    // Finalize the last plan
    if (currentPlan && currentPlan.referenceNumber && currentPlan.startPage) {
      currentPlan.endPage = totalPages
      currentPlan.pageCount = currentPlan.endPage - currentPlan.startPage + 1
      console.log(`📄 [PDFProcessing] Finalizing last plan:`, currentPlan)
      plans.push(currentPlan as ExtractedPlan)
      console.log(`✅ [PDFProcessing] Added final plan to collection: "${currentPlan.referenceNumber}"`)
    }

    console.log(`🎉 [PDFProcessing] Plan identification complete: ${plans.length} plans found`)
    return plans
  }

  /**
   * Split a PDF into individual plan files based on extracted plans
   */
  async splitPDFIntoPlans(
    file: File, 
    plans: ExtractedPlan[]
  ): Promise<ServiceResult<SplitPlanResult[]>> {
    try {
      const arrayBuffer = await file.arrayBuffer()
      const sourcePdf = await PDFDocument.load(arrayBuffer)
      
      const planFiles: SplitPlanResult[] = []
      
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
        const fileName = this.generatePlanFileName(plan.referenceNumber, file.name)
        
        console.log(`📋 [PDFProcessing] splitPDFIntoPlans generated file:`, { plan: plan.referenceNumber, fileName })
        planFiles.push({ plan, pdfData: pdfBytes, fileName })
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
    planFiles: SplitPlanResult[]
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

  /**
   * Process survey document entirely on client-side
   * This replaces the edge function approach
   */
  async processDocumentClientSide(
    file: File, 
    progressCallback?: (progress: ProcessingProgress) => void
  ): Promise<ServiceResult<ProcessedDocument>> {
    try {
      // Stage 1: Analyze document
      progressCallback?.({
        stage: 'analyzing',
        progress: 10,
        message: 'Analyzing document structure...'
      })

      const [metadataResult, bookmarksResult] = await Promise.all([
        this.extractMetadata(file),
        this.extractBookmarks(file)
      ])

      if (!metadataResult.success) {
        console.error(`❌ [PDFProcessing] Metadata extraction failed:`, metadataResult.error)
        throw new Error(`Failed to extract metadata: ${metadataResult.error}`)
      }
      
      if (!bookmarksResult.success) {
        console.error(`❌ [PDFProcessing] Bookmarks extraction failed:`, bookmarksResult.error)
        throw new Error(`Failed to extract bookmarks: ${bookmarksResult.error}`)
      }

      // Stage 2: Extract plan information
      progressCallback?.({
        stage: 'extracting',
        progress: 30,
        message: 'Identifying survey plans...'
      })

      const plans = this.identifyPlansFromBookmarks(
        bookmarksResult.data!,
        metadataResult.data!.pageCount
      )

      // Update progress with detected plans
      progressCallback?.({
        stage: 'extracting',
        progress: 40,
        message: `Found ${plans.length} plans`,
        plans: plans.map(p => ({ referenceNumber: p.referenceNumber, pageCount: p.pageCount }))
      })

      if (plans.length === 0) {
        console.warn(`⚠️ [PDFProcessing] No survey plans detected from bookmarks. Creating single plan from entire document.`)
        
        // Create a single plan covering the entire document
        const singlePlan: ExtractedPlan = {
          referenceNumber: metadataResult.data!.title || file.name.replace('.pdf', '') || 'Unknown',
          title: metadataResult.data!.title || file.name,
          startPage: 1,
          endPage: metadataResult.data!.pageCount,
          pageCount: metadataResult.data!.pageCount
        }
        
        plans.push(singlePlan)
        console.log(`📄 [PDFProcessing] Created fallback plan:`, singlePlan)
      }

      // Stage 3: Split PDF into individual plans
      progressCallback?.({
        stage: 'splitting',
        progress: 50,
        message: 'Splitting document into individual plans...'
      })

      const splitPlans: SplitPlanResult[] = []
      const arrayBuffer = await file.arrayBuffer()
      const sourcePdf = await PDFDocument.load(arrayBuffer)

      for (let i = 0; i < plans.length; i++) {
        const plan = plans[i]
        
        progressCallback?.({
          stage: 'splitting',
          progress: 50 + (i / plans.length) * 30,
          message: `Splitting plan ${plan.referenceNumber}...`,
          currentPlan: plan.referenceNumber
        })

        // Create new PDF document for this plan
        const planPdf = await PDFDocument.create()
        
        // Copy pages for this plan
        const startIndex = plan.startPage - 1 // Convert to 0-based
        const endIndex = plan.endPage - 1
        const pageIndices = Array.from(
          { length: endIndex - startIndex + 1 }, 
          (_, i) => startIndex + i
        )
        
        const copiedPages = await planPdf.copyPages(sourcePdf, pageIndices)
        copiedPages.forEach(page => planPdf.addPage(page))
        
        // Generate PDF data
        const pdfData = await planPdf.save()
        
        console.log(`📋 [PDFProcessing] Processing plan:`, plan)
        const fileName = this.generatePlanFileName(plan.referenceNumber, file.name)
        
        splitPlans.push({
          plan,
          pdfData,
          fileName
        })
      }

      // Complete
      progressCallback?.({
        stage: 'complete',
        progress: 100,
        message: `Successfully processed ${plans.length} plans`
      })

      return {
        success: true,
        data: {
          plans,
          splitPlans,
          metadata: metadataResult.data!,
          originalFileName: file.name
        }
      }

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to process document'
      }
    }
  }

  /**
   * Upload processed plans to Supabase storage
   */
  async uploadSplitPlans(
    splitPlans: SplitPlanResult[],
    projectId: string,
    progressCallback?: (progress: ProcessingProgress) => void
  ): Promise<ServiceResult<string[]>> {
    try {
      const { supabase } = await import('$lib/utils/supabase.js')
      const uploadedFiles: string[] = []

      for (let i = 0; i < splitPlans.length; i++) {
        const { plan, pdfData, fileName } = splitPlans[i]
        
        progressCallback?.({
          stage: 'uploading',
          progress: (i / splitPlans.length) * 100,
          message: `Uploading ${plan.referenceNumber}...`,
          currentPlan: plan.referenceNumber
        })

        // Validate fileName before creating path
        if (!fileName || fileName.includes('undefined')) {
          console.error(`❌ [PDFProcessing] Invalid fileName detected: ${fileName}`)
          throw new Error(`Invalid fileName for plan ${plan.referenceNumber}: ${fileName}`)
        }
        
        // Upload to Supabase storage
        const filePath = `projects/${projectId}/plans/${fileName}`
        console.log(`📁 [PDFProcessing] Uploading plan with path: ${filePath} (fileName: ${fileName})`)
        
        const { error } = await supabase.storage
          .from('project-files')
          .upload(filePath, pdfData, {
            contentType: 'application/pdf',
            upsert: true
          })

        if (error) {
          throw new Error(`Failed to upload ${fileName}: ${error.message}`)
        }

        uploadedFiles.push(filePath)
      }

      progressCallback?.({
        stage: 'complete',
        progress: 100,
        message: `Successfully uploaded ${uploadedFiles.length} plan files`
      })

      return { success: true, data: uploadedFiles }

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to upload plan files'
      }
    }
  }

  /**
   * Generate standardized filename for a plan PDF
   */
  private generatePlanFileName(referenceNumber: string, originalFileName: string): string {
    console.log(`📝 [PDFProcessing] generatePlanFileName called with:`, { referenceNumber, originalFileName })
    
    // Validate inputs
    if (!referenceNumber || referenceNumber.trim() === '') {
      console.error(`❌ [PDFProcessing] Invalid referenceNumber: ${referenceNumber}`)
      // Fallback to a generated reference
      referenceNumber = `plan_${Date.now()}`
    }
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0]
    const cleanRef = referenceNumber.trim().replace(/[^a-zA-Z0-9-]/g, '_')
    const extension = '.pdf'
    
    const fileName = `plan_${cleanRef}_${timestamp}${extension}`
    console.log(`📝 [PDFProcessing] Generated filename: ${fileName}`)
    
    // Validate final filename
    if (fileName.includes('undefined')) {
      console.error(`❌ [PDFProcessing] Generated filename contains undefined: ${fileName}`)
      return `plan_fallback_${Date.now()}.pdf`
    }
    
    return fileName
  }

  /**
   * Split and upload plans without full processing (used by modal workflow)
   */
  async splitAndUploadPlans(
    file: File,
    plans: ExtractedPlan[],
    projectId: string,
    progressCallback?: (progress: ProcessingProgress) => void
  ): Promise<ServiceResult<string[]>> {
    try {
      console.log(`📄 [PDFProcessing] Starting split and upload for ${plans.length} plans`)
      
      // Stage 1: Split PDF into individual plans
      progressCallback?.({
        stage: 'splitting',
        progress: 10,
        message: 'Splitting document into individual plans...'
      })

      const splitResult = await this.splitPDFIntoPlans(file, plans, progressCallback)
      if (!splitResult.success) {
        throw new Error(`Failed to split PDF: ${splitResult.error}`)
      }

      // Stage 2: Upload individual plan files
      progressCallback?.({
        stage: 'uploading',
        progress: 50,
        message: 'Uploading plan files...'
      })

      const uploadResult = await this.uploadSplitPlans(
        splitResult.data!,
        projectId,
        progressCallback
      )

      if (!uploadResult.success) {
        throw new Error(`Failed to upload plans: ${uploadResult.error}`)
      }

      progressCallback?.({
        stage: 'complete',
        progress: 100,
        message: 'Upload complete!'
      })

      return { success: true, data: uploadResult.data! }
    } catch (error) {
      console.error(`❌ [PDFProcessing] Split and upload failed:`, error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to split and upload plans' 
      }
    }
  }

  /**
   * Complete client-side processing workflow
   * This is the main method to replace edge function processing
   */
  async processAndUploadDocument(
    file: File,
    projectId: string,
    progressCallback?: (progress: ProcessingProgress) => void
  ): Promise<ServiceResult<{
    plans: ExtractedPlan[]
    uploadedFiles: string[]
    metadata: PDFMetadata
  }>> {
    try {
      // Step 1: Process document on client
      const processResult = await this.processDocumentClientSide(file, progressCallback)
      
      if (!processResult.success) {
        return processResult as ServiceResult<any>
      }

      const { plans, splitPlans, metadata } = processResult.data!

      // Step 2: Upload split plans
      const uploadResult = await this.uploadSplitPlans(splitPlans, projectId, progressCallback)
      
      if (!uploadResult.success) {
        return uploadResult as ServiceResult<any>
      }

      return {
        success: true,
        data: {
          plans,
          uploadedFiles: uploadResult.data!,
          metadata
        }
      }

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to process and upload document'
      }
    }
  }
}

// Export singleton instance
export const pdfProcessingService = new PDFProcessingService()
export default pdfProcessingService