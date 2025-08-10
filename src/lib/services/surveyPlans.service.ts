import { supabase } from '$lib/utils/supabase.js'
import type { 
  SurveyPlan, 
  SurveyPlanInsert, 
  SurveyPlanUpdate,
  SurveyPlanWithDetails,
  SurveyPlanWithTags,
  PlanFilters,
  ServiceResult 
} from '$lib/types/database.js'

class SurveyPlansService {
  /**
   * Get all survey plans for a project with optional filtering
   */
  async listPlans(
    projectId: string, 
    filters?: PlanFilters
  ): Promise<ServiceResult<SurveyPlanWithDetails[]>> {
    try {
      let query = supabase
        .from('survey_plans_with_tags')
        .select(`
          *,
          search_document:search_documents(title, status),
          annotations_count:plan_annotations(count)
        `)
        .eq('project_id', projectId)
        .eq('status', 'active')

      // Apply filters
      if (filters?.search) {
        query = query.or(`title.ilike.%${filters.search}%,reference_number.ilike.%${filters.search}%`)
      }

      if (filters?.status && filters.status.length > 0) {
        query = query.in('status', filters.status)
      }

      // Apply sorting
      const sortBy = filters?.sort_by || 'created_at'
      const sortOrder = filters?.sort_order || 'desc'
      query = query.order(sortBy, { ascending: sortOrder === 'asc' })

      const { data, error } = await query

      if (error) {
        return { success: false, error: error.message }
      }

      // Process the data to match our expected format
      const plans: SurveyPlanWithDetails[] = (data || []).map(plan => ({
        ...plan,
        tags: Array.isArray(plan.tags) ? plan.tags : [],
        annotations_count: plan.annotations_count?.[0]?.count || 0,
        relationships_count: 0 // TODO: Add relationships count
      }))

      // Filter by tags if specified
      let filteredPlans = plans
      if (filters?.tags && filters.tags.length > 0) {
        filteredPlans = plans.filter(plan => 
          plan.tags?.some(tag => filters.tags!.includes(tag.id))
        )
      }

      return { success: true, data: filteredPlans }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      }
    }
  }

  /**
   * Get a single survey plan with all its details
   */
  async getPlan(planId: string): Promise<ServiceResult<SurveyPlanWithDetails>> {
    try {
      const { data, error } = await supabase
        .from('survey_plans_with_tags')
        .select(`
          *,
          search_document:search_documents(title, status, file_path),
          annotations_count:plan_annotations(count),
          relationships:plan_relationships(
            id,
            relationship_type,
            notes,
            child_plan:survey_plans!plan_relationships_child_plan_id_fkey(
              id, reference_number, title
            ),
            parent_plan:survey_plans!plan_relationships_parent_plan_id_fkey(
              id, reference_number, title
            )
          )
        `)
        .eq('id', planId)
        .single()

      if (error) {
        return { success: false, error: error.message }
      }

      const plan: SurveyPlanWithDetails = {
        ...data,
        tags: Array.isArray(data.tags) ? data.tags : [],
        annotations_count: data.annotations_count?.[0]?.count || 0,
        relationships_count: data.relationships?.length || 0
      }

      return { success: true, data: plan }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      }
    }
  }

  /**
   * Create a new survey plan
   */
  async createPlan(planData: SurveyPlanInsert): Promise<ServiceResult<SurveyPlan>> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        return { success: false, error: 'User not authenticated' }
      }

      const { data, error } = await supabase
        .from('survey_plans')
        .insert({
          ...planData,
          created_by: user.id
        })
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
   * Update a survey plan
   */
  async updatePlan(
    planId: string, 
    updates: SurveyPlanUpdate
  ): Promise<ServiceResult<SurveyPlan>> {
    try {
      const { data, error } = await supabase
        .from('survey_plans')
        .update(updates)
        .eq('id', planId)
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
   * Delete a survey plan (soft delete by setting status to 'deleted')
   */
  async deletePlan(planId: string): Promise<ServiceResult<void>> {
    try {
      const { error } = await supabase
        .from('survey_plans')
        .update({ status: 'deleted' })
        .eq('id', planId)

      if (error) {
        return { success: false, error: error.message }
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
   * Permanently delete a survey plan and its file
   */
  async permanentlyDeletePlan(planId: string): Promise<ServiceResult<void>> {
    try {
      // First get the plan to find the file path
      const { data: plan, error: fetchError } = await supabase
        .from('survey_plans')
        .select('file_path')
        .eq('id', planId)
        .single()

      if (fetchError) {
        return { success: false, error: fetchError.message }
      }

      // Delete from database (this will cascade to annotations, relationships, etc.)
      const { error: deleteError } = await supabase
        .from('survey_plans')
        .delete()
        .eq('id', planId)

      if (deleteError) {
        return { success: false, error: deleteError.message }
      }

      // Delete file from storage
      if (plan.file_path) {
        await supabase.storage
          .from('project-files')
          .remove([plan.file_path])
        // Note: We don't fail if file deletion fails
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
   * Get plans by search document ID
   */
  async getPlansByDocument(documentId: string): Promise<ServiceResult<SurveyPlanWithTags[]>> {
    try {
      const { data, error } = await supabase
        .from('survey_plans_with_tags')
        .select('*')
        .eq('search_document_id', documentId)
        .eq('status', 'active')
        .order('sort_order', { ascending: true })

      if (error) {
        return { success: false, error: error.message }
      }

      const plans = (data || []).map(plan => ({
        ...plan,
        tags: Array.isArray(plan.tags) ? plan.tags : []
      }))

      return { success: true, data: plans }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      }
    }
  }

  /**
   * Update plan sort order (for drag-and-drop reordering)
   */
  async updatePlanOrder(planIds: string[]): Promise<ServiceResult<void>> {
    try {
      const updates = planIds.map((id, index) => ({
        id,
        sort_order: index
      }))

      const { error } = await supabase
        .from('survey_plans')
        .upsert(updates, { onConflict: 'id' })

      if (error) {
        return { success: false, error: error.message }
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
   * Duplicate a survey plan
   */
  async duplicatePlan(
    planId: string, 
    newReferenceNumber?: string
  ): Promise<ServiceResult<SurveyPlan>> {
    try {
      const { data: originalPlan, error: fetchError } = await supabase
        .from('survey_plans')
        .select('*')
        .eq('id', planId)
        .single()

      if (fetchError) {
        return { success: false, error: fetchError.message }
      }

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        return { success: false, error: 'User not authenticated' }
      }

      // Create new plan data (exclude id, created_at, updated_at)
      const { id, created_at, updated_at, ...planData } = originalPlan
      const duplicateData: SurveyPlanInsert = {
        ...planData,
        reference_number: newReferenceNumber || `${originalPlan.reference_number}-copy`,
        title: `${originalPlan.title} (Copy)`,
        created_by: user.id
      }

      const { data, error } = await supabase
        .from('survey_plans')
        .insert(duplicateData)
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
   * Archive/unarchive a plan
   */
  async toggleArchivePlan(planId: string): Promise<ServiceResult<SurveyPlan>> {
    try {
      // First get current status
      const { data: currentPlan, error: fetchError } = await supabase
        .from('survey_plans')
        .select('status')
        .eq('id', planId)
        .single()

      if (fetchError) {
        return { success: false, error: fetchError.message }
      }

      const newStatus = currentPlan.status === 'archived' ? 'active' : 'archived'

      const { data, error } = await supabase
        .from('survey_plans')
        .update({ status: newStatus })
        .eq('id', planId)
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
   * Get plan statistics for a project
   */
  async getPlanStats(projectId: string): Promise<ServiceResult<{
    total_plans: number
    active_plans: number
    archived_plans: number
    total_annotations: number
    plans_by_tag: Record<string, number>
  }>> {
    try {
      const { data, error } = await supabase
        .rpc('get_survey_plan_stats', { project_uuid: projectId })

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true, data: data || {
        total_plans: 0,
        active_plans: 0,
        archived_plans: 0,
        total_annotations: 0,
        plans_by_tag: {}
      }}
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      }
    }
  }

  /**
   * Search plans across multiple projects (for global search)
   */
  async searchPlans(
    searchTerm: string,
    projectIds?: string[]
  ): Promise<ServiceResult<SurveyPlanWithDetails[]>> {
    try {
      let query = supabase
        .from('survey_plans_with_tags')
        .select(`
          *,
          project:projects(title),
          search_document:search_documents(title)
        `)
        .eq('status', 'active')
        .or(`title.ilike.%${searchTerm}%,reference_number.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`)

      if (projectIds && projectIds.length > 0) {
        query = query.in('project_id', projectIds)
      }

      query = query.order('updated_at', { ascending: false }).limit(50)

      const { data, error } = await query

      if (error) {
        return { success: false, error: error.message }
      }

      const plans = (data || []).map(plan => ({
        ...plan,
        tags: Array.isArray(plan.tags) ? plan.tags : [],
        annotations_count: 0,
        relationships_count: 0
      }))

      return { success: true, data: plans }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      }
    }
  }

  /**
   * Get a signed URL for downloading a plan PDF
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
}

// Export singleton instance
export const surveyPlansService = new SurveyPlansService()
export default surveyPlansService