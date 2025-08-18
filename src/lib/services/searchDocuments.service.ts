import { supabase } from '$lib/utils/supabase.js'
import type { 
  SearchDocument, 
  SearchDocumentInsert, 
  ServiceResult,
  DocumentProcessingResult 
} from '$lib/types/database.js'

class SearchDocumentsService {
  /**
   * Upload a new search document to a project
   */
  async uploadDocument(
    projectId: string, 
    file: File, 
    title?: string
  ): Promise<ServiceResult<SearchDocument>> {
    console.log(`📤 [SearchDocuments] uploadDocument called:`, {
      projectId,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      title
    })
    
    try {
      // Generate unique file path
      const timestamp = Date.now()
      const filename = `${timestamp}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`
      const filePath = `projects/${projectId}/search-documents/${filename}`
      
      console.log(`📁 [SearchDocuments] Generated file path: ${filePath}`)

      // Upload file to Supabase Storage
      console.log(`🔄 [SearchDocuments] Starting file upload to Supabase Storage...`)
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('project-files')
        .upload(filePath, file)

      console.log(`📤 [SearchDocuments] Storage upload result:`, { uploadData, uploadError })

      if (uploadError) {
        console.error(`❌ [SearchDocuments] File upload failed:`, uploadError)
        return { success: false, error: `File upload failed: ${uploadError.message}` }
      }

      // Get current user
      console.log(`👤 [SearchDocuments] Getting current user...`)
      const { data: { user } } = await supabase.auth.getUser()
      console.log(`👤 [SearchDocuments] Current user:`, user?.id ? { id: user.id, email: user.email } : 'No user')
      
      if (!user) {
        console.error(`❌ [SearchDocuments] User not authenticated`)
        return { success: false, error: 'User not authenticated' }
      }

      // Create document record in database
      const documentData: SearchDocumentInsert = {
        project_id: projectId,
        title: title || file.name,
        file_path: uploadData.path,
        file_size: file.size,
        mime_type: file.type,
        uploaded_by: user.id
      }
      
      console.log(`💾 [SearchDocuments] Creating database record:`, documentData)

      const { data, error } = await supabase
        .from('search_documents')
        .insert(documentData)
        .select()
        .single()

      console.log(`💾 [SearchDocuments] Database insert result:`, { data, error })

      if (error) {
        console.error(`❌ [SearchDocuments] Database insert failed:`, error)
        // Clean up uploaded file if database insert fails
        console.log(`🧹 [SearchDocuments] Cleaning up uploaded file: ${filePath}`)
        await supabase.storage.from('project-files').remove([filePath])
        return { success: false, error: `Database error: ${error.message}` }
      }

      console.log(`✅ [SearchDocuments] Upload successful:`, data)
      return { success: true, data }
    } catch (error) {
      console.error(`❌ [SearchDocuments] Unexpected error:`, error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      }
    }
  }

  /**
   * Get all search documents for a project
   */
  async listDocuments(projectId: string): Promise<ServiceResult<SearchDocument[]>> {
    try {
      const { data, error } = await supabase
        .from('search_documents')
        .select(`
          *,
          uploaded_by_profile:profiles!search_documents_uploaded_by_fkey(first_name, last_name),
          reviewed_by_profile:profiles!search_documents_reviewed_by_fkey(first_name, last_name)
        `)
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true, data: data || [] }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      }
    }
  }

  /**
   * Get a single search document by ID
   */
  async getDocument(documentId: string): Promise<ServiceResult<SearchDocument>> {
    try {
      const { data, error } = await supabase
        .from('search_documents')
        .select(`
          *,
          uploaded_by_profile:profiles!search_documents_uploaded_by_fkey(first_name, last_name),
          reviewed_by_profile:profiles!search_documents_reviewed_by_fkey(first_name, last_name)
        `)
        .eq('id', documentId)
        .single()

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true, data }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      }
    }
  }

  /**
   * Delete a search document and its file
   */
  async deleteDocument(documentId: string): Promise<ServiceResult<void>> {
    try {
      // First get the document to find the file path
      const { data: document, error: fetchError } = await supabase
        .from('search_documents')
        .select('file_path')
        .eq('id', documentId)
        .single()

      if (fetchError) {
        return { success: false, error: fetchError.message }
      }

      // Delete from database first
      const { error: deleteError } = await supabase
        .from('search_documents')
        .delete()
        .eq('id', documentId)

      if (deleteError) {
        return { success: false, error: deleteError.message }
      }

      // Delete file from storage
      if (document.file_path) {
        await supabase.storage
          .from('project-files')
          .remove([document.file_path])
        // Note: We don't fail if file deletion fails, as the database record is already gone
      }

      return { success: true }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      }
    }
  }

  /**
   * Update document status (for approval workflow)
   */
  async updateDocumentStatus(
    documentId: string,
    status: SearchDocument['status'],
    comments?: string
  ): Promise<ServiceResult<SearchDocument>> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        return { success: false, error: 'User not authenticated' }
      }

      const { data, error } = await supabase
        .from('search_documents')
        .update({
          status,
          comments,
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString()
        })
        .eq('id', documentId)
        .select()
        .single()

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true, data }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      }
    }
  }

  /**
   * Process a document (DEPRECATED - now done client-side)
   * This method is kept for backward compatibility but should not be used
   * Use client-side processing in DocumentUpload component instead
   */
  async processDocument(documentId: string): Promise<ServiceResult<DocumentProcessingResult>> {
    console.warn(`⚠️ [SearchDocuments] processDocument is deprecated. Use client-side processing instead.`)
    return { 
      success: false, 
      error: 'Document processing is now handled client-side. This method is deprecated.' 
    }
  }

  /**
   * Get processing status for a document (DEPRECATED - now done client-side)
   * This method is kept for backward compatibility but should not be used
   */
  async getProcessingStatus(documentId: string): Promise<ServiceResult<{ 
    status: 'pending' | 'processing' | 'completed' | 'failed'
    progress?: number
    error?: string 
  }>> {
    console.warn(`⚠️ [SearchDocuments] getProcessingStatus is deprecated. Processing is now done client-side.`)
    return { 
      success: false, 
      error: 'Processing status is now handled client-side. This method is deprecated.' 
    }
  }

  /**
   * Get a signed URL for downloading a document
   */
  async getDownloadUrl(filePath: string): Promise<ServiceResult<string>> {
    try {
      const { data, error } = await supabase.storage
        .from('project-files')
        .createSignedUrl(filePath, 3600) // 1 hour expiry

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true, data: data.signedUrl }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      }
    }
  }

  /**
   * Get statistics for search documents in a project
   */
  async getDocumentStats(projectId: string): Promise<ServiceResult<{
    total_documents: number
    pending_documents: number
    approved_documents: number
    total_plans: number
    total_file_size: number
  }>> {
    try {
      const { data, error } = await supabase
        .rpc('get_search_document_stats', { project_uuid: projectId })

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true, data: data || {
        total_documents: 0,
        pending_documents: 0,
        approved_documents: 0,
        total_plans: 0,
        total_file_size: 0
      }}
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      }
    }
  }

  /**
   * Check if user can upload documents to project
   */
  async canUploadToProject(projectId: string): Promise<ServiceResult<boolean>> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        return { success: false, error: 'User not authenticated' }
      }

      // Check if user is project owner or has upload permissions
      const { data, error } = await supabase
        .from('projects')
        .select('owner_id, supervisor_id')
        .eq('id', projectId)
        .single()

      if (error) {
        return { success: false, error: error.message }
      }

      const canUpload = data.owner_id === user.id || data.supervisor_id === user.id
      return { success: true, data: canUpload }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      }
    }
  }

  /**
   * Create document record after client-side processing
   * This replaces the old upload + edge function approach
   */
  async createDocumentRecord(
    projectId: string,
    title: string,
    originalFileName: string,
    plans: any[],
    uploadedFiles: string[],
    metadata: any
  ): Promise<ServiceResult<SearchDocument>> {
    try {
      console.log(`💾 [SearchDocuments] Creating document record:`, {
        projectId,
        title,
        originalFileName,
        plansCount: plans.length,
        filesCount: uploadedFiles.length
      })

      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        return { success: false, error: 'User not authenticated' }
      }

      // Create the search document record
      const documentData = {
        project_id: projectId,
        title,
        file_path: uploadedFiles[0] || '', // Use first uploaded file as primary
        file_size: metadata.fileSize || 0,
        mime_type: 'application/pdf',
        uploaded_by: user.id,
        status: 'not_required' // Since we're processing client-side, no review needed
      }

      console.log(`💾 [SearchDocuments] Inserting document record:`, documentData)

      const { data: document, error: docError } = await supabase
        .from('search_documents')
        .insert(documentData)
        .select()
        .single()

      if (docError) {
        console.error(`❌ [SearchDocuments] Failed to create document record:`, docError)
        return { success: false, error: `Failed to create document record: ${docError.message}` }
      }

      // Create survey plan records for each extracted plan
      if (plans.length > 0) {
        console.log(`📋 [SearchDocuments] Creating ${plans.length} plan records...`)
        
        const planInserts = plans.map((plan, index) => {
          // Create page range array
          const pageNumbers = []
          for (let i = plan.startPage; i <= plan.endPage; i++) {
            pageNumbers.push(i)
          }
          
          return {
            project_id: projectId,
            search_document_id: document.id,
            reference_number: plan.referenceNumber,
            title: plan.title || plan.referenceNumber,
            file_path: uploadedFiles[index] || uploadedFiles[0], // Use corresponding file or fallback to first
            page_numbers: pageNumbers,
            file_size: metadata.fileSize || 0,
            created_by: user.id
          }
        })

        const { error: plansError } = await supabase
          .from('survey_plans')
          .insert(planInserts)

        if (plansError) {
          console.error(`❌ [SearchDocuments] Failed to create plan records:`, plansError)
          // Don't fail the entire operation, just log the error
          console.warn(`⚠️ [SearchDocuments] Document created but plan records failed: ${plansError.message}`)
        } else {
          console.log(`✅ [SearchDocuments] Successfully created ${plans.length} plan records`)
        }
      }

      console.log(`✅ [SearchDocuments] Document record created successfully:`, document)
      return { success: true, data: document }

    } catch (error) {
      console.error(`❌ [SearchDocuments] Error creating document record:`, error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create document record'
      }
    }
  }
}

// Export singleton instance
export const searchDocumentsService = new SearchDocumentsService()
export default searchDocumentsService