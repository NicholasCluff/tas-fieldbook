import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { PDFDocument } from 'https://esm.sh/pdf-lib@1.17.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ProcessRequest {
  documentId: string
}

interface ExtractedPlan {
  referenceNumber: string
  title: string
  startPage: number
  endPage: number
  pageCount: number
}

interface BookmarkInfo {
  title: string
  page: number
  level: number
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    const { documentId }: ProcessRequest = await req.json()

    if (!documentId) {
      return new Response(
        JSON.stringify({ error: 'Missing documentId' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log(`Processing document: ${documentId}`)

    // Get document from database
    const { data: document, error: docError } = await supabaseClient
      .from('search_documents')
      .select('*')
      .eq('id', documentId)
      .single()

    if (docError || !document) {
      console.error('Document fetch error:', docError)
      return new Response(
        JSON.stringify({ error: 'Document not found' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Download the PDF file from Supabase Storage
    const { data: fileData, error: downloadError } = await supabaseClient.storage
      .from('project-files')
      .download(document.file_path)

    if (downloadError || !fileData) {
      console.error('File download error:', downloadError)
      return new Response(
        JSON.stringify({ error: 'Failed to download file' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Convert file to ArrayBuffer
    const arrayBuffer = await fileData.arrayBuffer()
    const pdfDoc = await PDFDocument.load(arrayBuffer)
    const totalPages = pdfDoc.getPageCount()

    console.log(`PDF loaded with ${totalPages} pages`)

    // Extract plans using PDF.js bookmark analysis (same logic as HTML analyzer)
    const extractedPlans = await extractPlansFromBookmarks(arrayBuffer, totalPages)

    if (extractedPlans.length === 0) {
      console.log('No plans found from bookmarks, falling back to heuristic analysis')
      // Fallback to heuristic analysis if no bookmarks
      const fallbackPlans = createHeuristicPlans(totalPages, document.title || 'Document')
      if (fallbackPlans.length === 0) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'No survey plans could be identified from the document' 
          }),
          { 
            status: 200, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }
      extractedPlans.push(...fallbackPlans)
    }

    console.log(`Found ${extractedPlans.length} plans:`, 
      extractedPlans.map(p => `${p.referenceNumber} (pages ${p.startPage}-${p.endPage})`)
    )

    // Split PDF and create individual plan files
    const planResults = []
    for (const plan of extractedPlans) {
      try {
        // Create new PDF with just this plan's pages
        const planPdf = await PDFDocument.create()
        
        // Copy pages for this plan
        const pageIndices = Array.from({ length: plan.pageCount }, (_, i) => plan.startPage - 1 + i)
        const pages = await planPdf.copyPages(pdfDoc, pageIndices)
        
        pages.forEach(page => planPdf.addPage(page))
        
        // Set metadata
        planPdf.setTitle(plan.title)
        planPdf.setSubject(`Survey Plan ${plan.referenceNumber}`)
        planPdf.setCreator('TasFieldbook Survey Search Processor')
        
        const planPdfBytes = await planPdf.save()
        
        // Upload individual plan PDF to storage
        const planFileName = `${plan.referenceNumber.replace(/[^a-zA-Z0-9-]/g, '_')}.pdf`
        const planFilePath = `projects/${document.project_id}/survey-plans/${planFileName}`
        
        const { error: uploadError } = await supabaseClient.storage
          .from('project-files')
          .upload(planFilePath, planPdfBytes, {
            contentType: 'application/pdf',
            upsert: true
          })

        if (uploadError) {
          console.error(`Upload error for ${plan.referenceNumber}:`, uploadError)
          continue
        }

        // Create survey plan record in database
        const { data: surveyPlan, error: insertError } = await supabaseClient
          .from('survey_plans')
          .insert({
            project_id: document.project_id,
            search_document_id: documentId,
            reference_number: plan.referenceNumber,
            title: plan.title,
            file_path: planFilePath,
            page_numbers: Array.from({ length: plan.pageCount }, (_, i) => plan.startPage + i),
            file_size: planPdfBytes.length,
            created_by: document.uploaded_by
          })
          .select()
          .single()

        if (insertError) {
          console.error(`Database insert error for ${plan.referenceNumber}:`, insertError)
          // Clean up uploaded file
          await supabaseClient.storage
            .from('project-files')
            .remove([planFilePath])
          continue
        }

        planResults.push({
          referenceNumber: plan.referenceNumber,
          title: plan.title,
          pages: Array.from({ length: plan.pageCount }, (_, i) => plan.startPage + i),
          filePath: planFilePath,
          fileSize: planPdfBytes.length
        })

        console.log(`Successfully processed plan: ${plan.referenceNumber}`)

      } catch (error) {
        console.error(`Error processing plan ${plan.referenceNumber}:`, error)
        continue
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        plans: planResults,
        totalPlans: planResults.length
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('General error:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

/**
 * Extract plans from PDF bookmarks using PDF.js (same logic as HTML analyzer)
 * This replicates the working bookmark analysis from the browser tool
 */
async function extractPlansFromBookmarks(arrayBuffer: ArrayBuffer, totalPages: number): Promise<ExtractedPlan[]> {
  try {
    console.log('=== EXTRACTING BOOKMARKS WITH PDF.js ===')
    
    // Import PDF.js dynamically for Deno
    const pdfjs = await import('https://esm.sh/pdfjs-dist@3.11.174')
    
    // Load PDF with PDF.js
    const loadingTask = pdfjs.getDocument({ data: arrayBuffer })
    const pdf = await loadingTask.promise
    
    console.log(`PDF.js loaded: ${pdf.numPages} pages`)
    
    // Get bookmarks/outline
    const outline = await pdf.getOutline()
    
    if (!outline || outline.length === 0) {
      console.log('❌ No bookmarks found in PDF')
      return []
    }
    
    console.log(`✅ Found ${outline.length} top-level bookmarks`)
    
    // Parse bookmarks (same as HTML analyzer)
    const bookmarks = await parseBookmarks(pdf, outline, 0)
    
    // Analyze bookmarks for plans (exact same logic as HTML analyzer)
    const plans = analyzePlansFromBookmarks(bookmarks, totalPages)
    
    return plans
    
  } catch (error) {
    console.error('Error extracting bookmarks:', error.message)
    return []
  }
}

/**
 * Parse PDF.js bookmarks recursively (same as HTML analyzer)
 */
async function parseBookmarks(pdf: any, items: any[], level: number): Promise<BookmarkInfo[]> {
  const bookmarks: BookmarkInfo[] = []
  
  for (const item of items) {
    try {
      let pageNum: number | null = null
      
      if (item.dest) {
        let dest
        if (typeof item.dest === 'string') {
          dest = await pdf.getDestination(item.dest)
        } else {
          dest = item.dest
        }
        
        if (dest && dest[0]) {
          const pageIndex = await pdf.getPageIndex(dest[0])
          pageNum = pageIndex + 1 // Convert to 1-based
        }
      }
      
      const bookmark: BookmarkInfo = {
        title: item.title,
        page: pageNum || 0,
        level: level
      }
      
      bookmarks.push(bookmark)
      
      // Recursively parse children
      if (item.items && item.items.length > 0) {
        const childBookmarks = await parseBookmarks(pdf, item.items, level + 1)
        bookmarks.push(...childBookmarks)
      }
      
    } catch (error) {
      console.warn(`Error processing bookmark "${item.title}": ${error.message}`)
    }
  }
  
  return bookmarks
}

/**
 * Analyze bookmarks for survey plans (EXACT same logic as HTML analyzer)
 */
function analyzePlansFromBookmarks(bookmarks: BookmarkInfo[], totalPages: number): ExtractedPlan[] {
  console.log('\\n=== ANALYZING BOOKMARKS FOR SURVEY PLANS ===')
  
  // Filter bookmarks with valid pages
  const flatBookmarks = bookmarks.filter(b => b.page > 0)
  console.log(`Found ${flatBookmarks.length} bookmarks with valid pages`)
  
  // Simplified: treat every bookmark title as a plan reference (SAME AS HTML ANALYZER)
  const detectedPlans: ExtractedPlan[] = []
  let currentPlan: ExtractedPlan | null = null
  
  for (let i = 0; i < flatBookmarks.length; i++) {
    const bookmark = flatBookmarks[i]
    const planRef = bookmark.title.trim() // Use the entire title as reference
    
    console.log(`\\nAnalyzing: "${bookmark.title}" (Page ${bookmark.page})`)
    
    // Check if this is a new plan (different reference) or continuation of current plan
    if (!currentPlan || currentPlan.referenceNumber !== planRef) {
      // Finalize previous plan if it exists
      if (currentPlan) {
        currentPlan.endPage = bookmark.page - 1
        currentPlan.pageCount = currentPlan.endPage - currentPlan.startPage + 1
        console.log(`  📋 Finalized plan "${currentPlan.referenceNumber}": Pages ${currentPlan.startPage}-${currentPlan.endPage} (${currentPlan.pageCount} pages)`)
      }
      
      // Start new plan
      currentPlan = {
        referenceNumber: planRef,
        title: `Plan ${planRef}`,
        startPage: bookmark.page,
        endPage: totalPages, // Will be updated when next plan starts or at end
        pageCount: 0 // Will be calculated
      }
      
      detectedPlans.push(currentPlan)
      console.log(`  ✅ Started new plan: "${planRef}" starting at page ${bookmark.page}`)
    } else {
      console.log(`  ➡️ Continuing plan "${planRef}"`)
    }
  }
  
  // Finalize the last plan
  if (currentPlan) {
    currentPlan.endPage = totalPages
    currentPlan.pageCount = currentPlan.endPage - currentPlan.startPage + 1
    console.log(`\\n📋 Finalized last plan "${currentPlan.referenceNumber}": Pages ${currentPlan.startPage}-${currentPlan.endPage} (${currentPlan.pageCount} pages)`)
  }
  
  console.log(`\\n=== DETECTION SUMMARY ===`)
  console.log(`Plans detected: ${detectedPlans.length}`)
  
  return detectedPlans
}

/**
 * Fallback heuristic plan creation when no bookmarks available
 */
function createHeuristicPlans(totalPages: number, filename: string): ExtractedPlan[] {
  console.log('Creating fallback heuristic plans')
  
  // Create a simple single plan as fallback
  return [{
    referenceNumber: 'PLAN_001',
    title: 'Survey Plan 1',
    startPage: 1,
    endPage: totalPages,
    pageCount: totalPages
  }]
}